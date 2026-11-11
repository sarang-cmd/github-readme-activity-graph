import { Fetcher } from '../src/fetcher';
import {
    mockQueryCorrect,
    mockQueryIncorrect,
    mockFetchCorrect,
    mockFetchIncorrect,
} from './mockFunctions';
import { expectedQuery } from './fakeInputs';
import { UserDetails } from '../src/interfaces/interface';

describe('Fetching Tests', () => {
    const fetcher = new Fetcher('ashutosh00710');
    it('Query Test', () => {
        const expected = expectedQuery(
            'ashutosh00710',
            '2022-05-01T00:00:00.000+00:00',
            '2022-06-01T00:00:00.000+00:00',
        );
        expect(
            // @ts-ignore: testing private method
            fetcher.getGraphQLQuery(
                '2022-05-01T00:00:00.000+00:00',
                '2022-06-01T00:00:00.000+00:00',
            ),
        ).toEqual(expected);
    });

    it('Fetching Contributions Test', async () => {
        // @ts-ignore: mocking private method
        fetcher.getGraphQLQuery = mockQueryCorrect;
        // @ts-ignore: mocking private method
        fetcher.fetch = mockFetchCorrect;

        // @ts-ignore: this will always return user details
        const data: UserDetails = await fetcher.fetchContributions(31);
        expect(data.contributions).toEqual(expect.any(Array));
        expect(data.contributions.length).toEqual(31);
        expect(data.name).toEqual('Ashutosh Dwivedi');

        // @ts-ignore: mocking private method
        fetcher.getGraphQLQuery = mockQueryIncorrect;
        // @ts-ignore: mocking private method
        fetcher.fetch = mockFetchIncorrect;

        const error = await fetcher.fetchContributions(31);
        expect(error).toEqual('GitHub could not resolve username "ashutosh00710" (NOT_FOUND).');
    });

    it('reports GitHub authentication failures instead of blaming the username', async () => {
        const authFetcher = new Fetcher('sarang-cmd');
        // @ts-ignore: mocking private method
        authFetcher.getGraphQLQuery = jest.fn();
        // @ts-ignore: mocking private method
        authFetcher.fetch = jest.fn().mockRejectedValue({ response: { status: 401 } });

        await expect(authFetcher.fetchContributions(31)).resolves.toBe(
            'GitHub rejected the configured TOKEN (HTTP 401). It may be expired or revoked.',
        );
    });
});
