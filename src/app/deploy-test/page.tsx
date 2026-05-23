export const dynamic = "force-dynamic";

export default function DeployTestPage() {
  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1>DEPLOY TEST</h1>
      <p>If you see this, Vercel IS deploying new code.</p>
      <p>Commit: 219e468</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}
