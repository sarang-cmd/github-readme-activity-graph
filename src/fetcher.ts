import axios, { AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';
import moment from 'moment';
import { Query, UserDetails, Week, ContributionDay, ResponseOfApi } from 'src/interfaces/interface';

dotenv.config();

export class Fetcher {
    private readonly username: string;
    constructor(username: string) {
        this.username = username;
    }

    private getGraphQLQuery(from: string, to: string) {
        return {
            query: `
              query userInfo($LOGIN: String!, $FROM: DateTime!, $TO: DateTime!) {
                user(login: $LOGIN) {
                  name
                  contributionsCollection(from: $FROM, to: $TO) {
                    contributionCalendar {
                      weeks {
                        contributionDays {
                          contributionCount
                          date
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
                LOGIN: this.username,
                FROM: from,
                TO: to,
            },
        };
    }

    private async fetch(graphQLQuery: Query): Promise<AxiosResponse<ResponseOfApi>> {
        return axios({
            url: 'https://api.github.com/graphql',
            method: 'POST',
            headers: {
                Authorization: `bearer ${process.env.TOKEN}`,
            },
            data: graphQLQuery,
        });
    }

    private graphQLErrorMessage(error: { type?: string; message?: string }): string {
        const type = error.type || 'UNKNOWN';
        const message = error.message || '';

        if (type === 'RATE_LIMITED' || /rate limit/i.test(message)) {
            return '💥 GitHub API rate limit exceeded. Please try again later.';
        }
        if (/bad credentials|unauthenticated|unauthorized/i.test(message)) {
            return 'GitHub rejected the configured TOKEN. It may be missing, expired, or revoked.';
        }
        if (/forbidden|permission|resource not accessible/i.test(message)) {
            return 'GitHub denied access to contribution data. Check the configured TOKEN permissions.';
        }
        if (type === 'NOT_FOUND') {
            return `GitHub could not resolve username "${this.username}" (NOT_FOUND).`;
        }

        return `GitHub GraphQL request failed (${type}). Check the configured TOKEN and Vercel runtime logs.`;
    }

    private requestErrorMessage(error: unknown): string {
        const requestError = error as {
            response?: { status?: number; data?: { message?: string } };
            code?: string;
        };
        const status = requestError?.response?.status;
        const apiMessage = requestError?.response?.data?.message || '';

        if (status === 401) {
            return 'GitHub rejected the configured TOKEN (HTTP 401). It may be expired or revoked.';
        }
        if (status === 403 && /rate limit/i.test(apiMessage)) {
            return '💥 GitHub API rate limit exceeded. Please try again later.';
        }
        if (status === 403) {
            return 'GitHub denied the request (HTTP 403). Check the configured TOKEN permissions.';
        }
        if (status) {
            return `GitHub API request failed (HTTP ${status}).`;
        }
        if (requestError?.code) {
            return `Could not connect to GitHub API (${requestError.code}).`;
        }
        return 'GitHub API request failed. Check the Vercel runtime logs.';
    }

    public async fetchContributions(
        days: number,
        customFromDate?: string,
        customToDate?: string,
    ): Promise<UserDetails | string> {
        let from = '',
            to = '';
        if (customFromDate && customToDate) {
            from = moment(customFromDate).utc().toISOString(true);
            to = moment(customToDate).utc().toISOString(true);
        } else {
            const now = moment();
            from = moment(now).subtract(days, 'days').utc().toISOString();
            // also include the next day in case our server is behind in time with respect to GitHub
            to = moment(now).add(1, 'days').utc().toISOString();
        }

        try {
            const apiResponse = await this.fetch(this.getGraphQLQuery(from, to));

            if (apiResponse.data.errors?.length) {
                console.error('GitHub GraphQL errors:', apiResponse.data.errors);
                return this.graphQLErrorMessage(apiResponse.data.errors[0]);
            } else if (apiResponse.data.data) {
                if (apiResponse.data.data.user === null) {
                    return `GitHub returned no profile for "${this.username}". Check the login and configured TOKEN access.`;
                } else {
                    const userData: UserDetails = {
                        contributions: [],
                        name: apiResponse.data.data.user.name,
                    };
                    //filtering the week data from API response
                    const weeks =
                        apiResponse.data.data.user.contributionsCollection.contributionCalendar
                            .weeks;
                    // get day-contribution data
                    weeks.map((week: Week) =>
                        week.contributionDays.map((contributionDay: ContributionDay) => {
                            contributionDay.date = moment(contributionDay.date, moment.ISO_8601)
                                .date()
                                .toString();
                            userData.contributions.push(contributionDay);
                        }),
                    );

                    // if 32nd entry is 0 means:
                    // either the day hasn't really started
                    // or the user hasn't contributed today
                    const length = userData.contributions.length;
                    if (!(customFromDate && customToDate)) {
                        if (userData.contributions[length - 1].contributionCount === 0) {
                            userData.contributions.pop();
                        }
                        const extra = userData.contributions.length - days;
                        userData.contributions.splice(0, extra);
                    }
                    return userData;
                }
            } else {
                console.error('Unexpected API response structure');
                throw new Error('Unexpected API response structure');
            }
        } catch (error) {
            console.error('GitHub contribution request failed:', error);
            return this.requestErrorMessage(error);
        }
    }
}
