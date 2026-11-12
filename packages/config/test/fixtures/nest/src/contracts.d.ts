// Stands in for @app/contracts, so the fixture needs no workspace link.
declare module '@app/contracts' {
  export interface GitHubRepository {
    fullName: string;
  }
}
