import express from 'express';
import request from 'supertest';
import { Fetcher } from '../src/fetcher';
import graphHandler from '../src/graph-handler';

describe('Vercel graph handler response', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns the rendered SVG with explicit UTF-8 headers and byte length', async () => {
        const fetchContributions = jest
            .spyOn(Fetcher.prototype, 'fetchContributions')
            .mockResolvedValue({
                name: 'Test User',
                contributions: [
                    { contributionCount: 1, date: '1' },
                    { contributionCount: 3, date: '2' },
                    { contributionCount: 2, date: '3' },
                ],
            });
        const app = express();
        app.get('/graph', graphHandler);

        const response = await request(app).get('/graph?username=test-user').expect(200);
        const svg = response.text || Buffer.from(response.body).toString('utf8');

        expect(response.headers['content-type']).toBe('image/svg+xml; charset=utf-8');
        expect(response.headers['cache-control']).toBe('public, max-age=1800');
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['content-length']).toBe(String(Buffer.byteLength(svg, 'utf8')));
        expect(svg).toContain('<svg');
        expect(fetchContributions).toHaveBeenCalledWith(31, '', '');
    });

    it('returns a valid error SVG without caching when GitHub returns an error', async () => {
        jest.spyOn(Fetcher.prototype, 'fetchContributions').mockResolvedValue(
            'GitHub could not resolve this user.',
        );
        const app = express();
        app.get('/graph', graphHandler);

        const response = await request(app).get('/graph?username=missing-user').expect(200);
        const svg = response.text || Buffer.from(response.body).toString('utf8');

        expect(response.headers['content-type']).toBe('image/svg+xml; charset=utf-8');
        expect(response.headers['cache-control']).toBe('no-store, max-age=0');
        expect(response.headers['content-length']).toBe(String(Buffer.byteLength(svg, 'utf8')));
        expect(svg).toContain('<svg');
    });
});
