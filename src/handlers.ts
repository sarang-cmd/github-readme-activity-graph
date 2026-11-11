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

            if (diagnosticMode === 'svg-static') {
                const svg = Buffer.from(
                    '<svg xmlns="http://www.w3.org/2000/svg"><text>ok</text></svg>',
                    'utf8',
                );
                res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
                res.setHeader('Content-Length', `${svg.byteLength}`);
                res.status(200);
                res.end(svg);
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

            if (diagnosticMode === 'full-svg-json') {
                res.status(200).json({
                    ok: true,
                    svgBytes: Buffer.byteLength(finalGraph, 'utf8'),
                    svg: finalGraph,
                });
                return;
            }

            if (diagnosticMode === 'full-svg') {
                const svg = Buffer.from(finalGraph, 'utf8');
                res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
                res.setHeader('Content-Length', `${svg.byteLength}`);
                res.status(200);
                res.end(svg);
                return;
            }

            if (diagnosticMode === 'full-text') {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.status(200);
                res.end(finalGraph);
                return;
            }

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

            stage = 'set-response-headers';
            utils.setHttpHeader(res, header.maxAge);
            stage = 'send-svg';
            const svg = Buffer.from(finalGraph, 'utf8');
            res.setHeader('Content-Length', `${svg.byteLength}`);
            res.status(200);
            res.end(svg);
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

            if (
                ['full', 'send', 'full-svg-json', 'full-svg', 'full-text', 'svg-static'].includes(
                    diagnosticMode,
                )
            ) {
                res.status(200).json({
                    ok: false,
                    stage,
                    runtime: process.version,
                    errorType: graphError?.name || 'UnknownError',
                    error: graphError?.message || 'Unknown error',
                });
                return;
            }

            const errorSvg = Buffer.from(
                invalidUserSvg(
                    `Something unexpected happened 💥 ${String(error && (error as any).message ? (error as any).message : error)}`,
                ),
                'utf8',
            );
            res.setHeader('Cache-Control', 'no-store, max-age=0');
            res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
            res.setHeader('Content-Length', `${errorSvg.byteLength}`);
            res.status(200);
            res.end(errorSvg);
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
