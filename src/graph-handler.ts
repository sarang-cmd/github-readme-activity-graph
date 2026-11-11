import { IncomingMessage, ServerResponse } from 'node:http';
import { Fetcher } from './fetcher';
import { ParsedQs } from './interfaces/interface';
import { invalidUserSvg } from './svgs';
import { Utilities } from './utils';

const SVG_CONTENT_TYPE = 'image/svg+xml';
const ALLOWED_METHODS = 'GET, HEAD, OPTIONS';

function getQuery(request: IncomingMessage): ParsedQs {
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    const query: Record<string, string> = {};

    requestUrl.searchParams.forEach((value, key) => {
        query[key] = value;
    });

    return query as unknown as ParsedQs;
}

function sendSvg(
    response: ServerResponse,
    svg: string,
    cacheControl: string,
    headOnly: boolean,
): void {
    response.statusCode = 200;
    response.setHeader('Cache-Control', cacheControl);
    response.setHeader('Content-Type', SVG_CONTENT_TYPE);
    response.end(headOnly ? undefined : svg);
}

export default async function graphHandler(
    request: IncomingMessage,
    response: ServerResponse,
): Promise<void> {
    response.setHeader('Access-Control-Allow-Origin', '*');

    if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
        const requestedHeaders = request.headers['access-control-request-headers'];
        if (requestedHeaders) {
            response.setHeader('Access-Control-Allow-Headers', requestedHeaders);
        }
        response.statusCode = 204;
        response.end();
        return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', ALLOWED_METHODS);
        response.statusCode = 405;
        response.end();
        return;
    }

    const utils = new Utilities(getQuery(request));
    let svg: string;
    let cacheControl: string;

    try {
        const fetcher = new Fetcher(utils.username);
        const queryOptions = utils.queryOptions();
        const fetchCalendarData = await fetcher.fetchContributions(
            queryOptions.days,
            queryOptions.from,
            queryOptions.to,
        );
        const graph = await utils.buildGraph(fetchCalendarData);
        svg = graph.finalGraph;
        cacheControl = graph.header.maxAge;
    } catch (error) {
        const graphError = error as {
            message?: string;
            code?: string;
            response?: { status?: number };
        };
        console.error('getGraph error:', {
            message: graphError?.message || 'Unknown error',
            code: graphError?.code,
            status: graphError?.response?.status,
        });
        const message =
            error instanceof Error ? error.message : String(error === undefined ? 'Unknown error' : error);
        svg = invalidUserSvg(`Something unexpected happened 💥 ${message}`);
        cacheControl = 'no-store, max-age=0';
    }

    sendSvg(response, svg, cacheControl, request.method === 'HEAD');
}
