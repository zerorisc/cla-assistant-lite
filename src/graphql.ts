import { octokit } from './octokit'
import { context } from '@actions/github'
import { CommittersDetails } from './interfaces'



export default async function getCommitters(): Promise<CommittersDetails[]> {
    try {
        let committers: CommittersDetails[] = []
        let filteredCommitters: CommittersDetails[] = []
        let response: any = await octokit.graphql(`
        query($owner:String! $name:String! $number:Int! $cursor:String!){
            repository(owner: $owner, name: $name) {
            pullRequest(number: $number) {
                commits(first: 100, after: $cursor) {
                    totalCount
                    edges {
                        node {
                            commit {
                                committer {
                                    name
                                    user {
                                        id
                                        databaseId
                                        login
                                    }
                                }
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        endCursor
                        hasNextPage
                    }
                }
            }
        }
    }`.replace(/ /g, ''), {
            owner: context.repo.owner,
            name: context.repo.repo,
            number: context.issue.number,
            cursor: ''
        })
        response.repository.pullRequest.commits.edges.forEach(edge => {
            const committer = extractUserFromCommit(edge.node.commit)
            let user = {
                name: committer.login || committer.name,
                id: committer.databaseId || '',
                pullRequestNo: context.issue.number
            }
            if (committers.length === 0 || committers.map((c) => {
                return c.name
            }).indexOf(user.name) < 0) {
                committers.push(user)
            }
        })
        filteredCommitters = committers.filter((committer) => {
            return committer.id !== 41898282
        })
        return filteredCommitters

    } catch (e) {
        throw new Error(`graphql call to get the committers details failed: ${e}`)
    }

}
// Signature check protocol only checks for a signature by the committer, not
// all authors of code being merged in. This allows the repository to accept
// code from other Apache-licensed projects and maintain the original Git
// history without requiring a signature from code authors who are not
// contributors to the accepting repository.
const extractUserFromCommit = (commit) => commit.committer.user || commit.committer
