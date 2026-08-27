export const testJob = {
  companyName: "E2E Sample Technologies",
  sourceName: "Prizgram E2E synthetic fixture",
  sourceUrl: "https://example.com/e2e/frontend-intern",
  body: `E2E Sample Technologiesでは、学生向けWebアプリケーションのフロントエンドエンジニアを募集しています。TypeScript、React、Next.jsを使い、ユーザー向け機能の設計・実装・レビュー・テストに参加します。必須要件はTypeScriptまたはJavaScriptを使ったWeb開発経験、Gitを利用したチーム開発への理解、基本的なHTML/CSSの知識です。歓迎要件はNext.js、Node.js、SQL、Playwright、GitHub Actions、Dockerの経験です。ユーザー課題をコードとデータから検証し、小さな単位で改善を継続する姿勢を重視します。リモートワークを活用でき、定期的なコードレビューと1on1があります。選考では過去の開発経験、チームでの改善経験、技術選定の考え方を確認します。`,
} as const;

export const updatedTestJobBody = `${testJob.body}\n追加要件として、アクセシビリティとレスポンシブUIの改善経験を歓迎します。`;
