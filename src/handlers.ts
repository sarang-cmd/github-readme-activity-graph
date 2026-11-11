import { Utilities } from './utils';
import { Request, Response } from 'express';
import { Fetcher } from './fetcher';
import { invalidUserSvg } from './svgs';
import { UserDetails } from './interfaces/interface';

export class Handlers {
    public getRoot(_req: Request, res: Response) {
        res.send(`<h1>GitHub Readme Activity Graph 📈</h1>`);
    }

    public async getGraph(req: Request, res: Response) {
        const diagnosticMode = String(req.query.diag || '');
        let stage = 'route-entry';

        try {
            if (diagnosticMode === 'runtime') {
                res.status(200).json({
                    route: 'graph',
                    runtime: process.version,
                    vercel: Boolean(process.env.VERCEL),
                    tokenConfigured: Boolean(process.env.TOKEN),
                });
                return;
            }

            stage = 'query-options';
            const utils = new Utilities(req.query);

            const fetcher = new Fetcher(utils.username);
            const queryOptions = utils.queryOptions();
            stage = 'github-fetch';
            const fetchCalendarData = await fetcher.fetchContributions(
                queryOptions.days,
                queryOptions.from,
                queryOptions.to,
            );

            stage = 'graph-render';
            const { finalGraph, header } = await utils.buildGraph(fetchCalendarData);

            if (diagnosticMode === 'full') {
                res.status(200).json({
                    ok: true,
                    runtime: process.version,
                    tokenConfigured: Boolean(process.env.TOKEN),
                    fetchResultType: typeof fetchCalendarData,
                    contributionCount:
                        typeof fetchCalendarData === 'object'
                            ? fetchCalendarData.contributions.length
                            : null,
                    fetchMessage:
                        typeof fetchCalendarData === 'string'
                            ? fetchCalendarData.slice(0, 240)
                            : undefined,
                    svgBytes: Buffer.byteLength(finalGraph, 'utf8'),
                });
                return;
            }

            stage = 'response';
            utils.setHttpHeader(res, header.maxAge);
            res.status(200).send(finalGraph);
        } catch (error) {
            const graphError = error as {
                name?: string;
                message?: string;
                code?: string;
                response?: { status?: number };
            };
            console.error('getGraph error:', {
                message: graphError?.message || 'Unknown error',
                code: graphError?.code,
                status: graphError?.response?.status,
            });

            if (diagnosticMode === 'full') {
                res.status(200).json({
                    ok: false,
                    stage,
                    runtime: process.version,
                    errorType: graphError?.name || 'UnknownError',
                    error: graphError?.message || 'Unknown error',
                });
                return;
            }

            res.setHeader('Cache-Control', 'no-store, max-age=0');
            res.set('Content-Type', 'image/svg+xml');
            res.send(invalidUserSvg(`Something unexpected happened 💥 ${String(error && (error as any).message ? (error as any).message : error)}`));
        }
    }

    public async getData(req: Request, res: Response) {
        try {
            const utils = new Utilities(req.query);

            const fetcher = new Fetcher(utils.username);
            const fetchCalendarData: UserDetails | string = await fetcher.fetchContributions(
                utils.queryOptions().days,
            );

            if (typeof fetchCalendarData === 'object') {
                res.status(200).send(fetchCalendarData);
            } else {
                res.send(invalidUserSvg(fetchCalendarData));
            }
        } catch (error) {
            res.send(invalidUserSvg('Something unexpected happened 💥'));
        }
    }
}
