export const dynamic = "force-dynamic";
export default function DeployTestPage() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>DEPLOY TEST</h1>
      <p>Commit: d2ed1d3</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}
