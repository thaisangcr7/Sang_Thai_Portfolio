// Architecture specs. Every label comes from the project's own write-up on sangthai.dev.
// kind: src | proc | ai | store | out | guard
module.exports = {
  avenotes: {
    name: 'Avenotes', kicker: 'Live AI meeting assistant',
    stages: [
      { label: 'Capture', nodes: [{ k: 'src', t: 'Live meeting audio', s: 'streams in while people talk' }] },
      { label: 'Transcribe', nodes: [{ k: 'ai', t: 'Deepgram API', s: 'speech-to-text with speaker labels' }] },
      { label: 'Backend', nodes: [
        { k: 'proc', t: 'FastAPI on Render', s: 'real-time Python pipeline' },
        { k: 'store', t: 'Supabase Postgres', s: 'meetings + recaps, row-level security' } ] },
      { label: 'Reason', nodes: [{ k: 'ai', t: 'Anthropic API', s: 'live answers, recaps, search across past meetings' }] },
      { label: 'Show', nodes: [{ k: 'out', t: 'React + TypeScript app', s: 'on Vercel, answers name the meeting they came from' }] },
    ],
    rails: [
      { k: 'guard', t: 'Margin guardrails', s: 'per-plan usage allowance + daily spend breaker on model cost' },
      { k: 'guard', t: 'Billing', s: 'paid access only via a signature-verified Stripe webhook' },
      { k: 'guard', t: 'CI gate', s: 'pytest + Playwright end-to-end suites gate every backend deploy' },
    ],
  },
  atlas: {
    name: 'ATLAS', kicker: 'Config-driven controls testing · simplified public view',
    stages: [
      { label: 'Source', nodes: [{ k: 'src', t: 'Application extracts', s: 'Excel, CSV and JSON files' }] },
      { label: 'Configure', nodes: [{ k: 'proc', t: 'JSON config per app', s: 'new app = one config entry + template scripts' }] },
      { label: 'Ingest + validate', nodes: [{ k: 'proc', t: 'Shared Python modules', s: 'ingest, validate, export (pandas)' }] },
      { label: 'Test', nodes: [
        { k: 'guard', t: 'Approval threshold', s: 'rules per application' },
        { k: 'guard', t: 'Duplicate payment', s: 'full population, not samples' },
        { k: 'guard', t: 'Dual blind rekey', s: 'rules per application' } ] },
      { label: 'Report', nodes: [{ k: 'out', t: 'Test results', s: 'exported as Excel, CSV and JSON' }] },
    ],
    metrics: [['100 → <5 hrs', 'monthly testing'], ['$1.5T', 'monthly payment value tested'], ['50+', 'apps in the program']],
    note: 'Code is internal to Citi. Shows the design only, no internal code or data.',
  },
  avocado: {
    name: 'Avocado', kicker: 'Team knowledge + analysis copilot',
    stages: [
      { label: 'Upload', nodes: [{ k: 'src', t: 'Docs + spreadsheets', s: 'one workspace per team' }] },
      { label: 'Access', nodes: [{ k: 'guard', t: 'Role-based access', s: 'tenant isolation in code, 9 cross-tenant tests' }] },
      { label: 'Route', nodes: [
        { k: 'ai', t: 'Model router', s: 'Anthropic, OpenAI, Ollama' },
        { k: 'proc', t: 'Tools over MCP', s: 'each switch shows its context cost' } ] },
      { label: 'Answer (2 paths)', nodes: [
        { k: 'store', t: 'Quoted', s: 'pgvector retrieval, sources listed underneath' },
        { k: 'proc', t: 'Computed', s: 'writes Python, runs it in a locked sandbox' } ] },
      { label: 'Show the proof', nodes: [{ k: 'out', t: 'Answer + evidence', s: 'source chips, or the code behind the number' }] },
    ],
    rails: [
      { k: 'guard', t: 'Sandbox', s: 'no network, read-only filesystem, hard memory + CPU caps on every run, 16 container-escape tests' },
    ],
  },
  creditrag: {
    name: 'credit-rag', kicker: 'Cited extraction from credit agreements',
    stages: [
      { label: 'Upload', nodes: [{ k: 'src', t: 'Credit agreement PDF', s: '200-page commercial agreement' }] },
      { label: 'Queue', nodes: [{ k: 'proc', t: 'Kafka + idempotent worker', s: 'same document twice is safe' }] },
      { label: 'Parse + index', nodes: [
        { k: 'proc', t: 'Docling', s: 'pages to text' },
        { k: 'store', t: 'pgvector', s: 'vector index' } ] },
      { label: 'Retrieve (2 passes)', nodes: [
        { k: 'store', t: 'Vector similarity', s: 'gather candidates' },
        { k: 'proc', t: 'Re-ranker', s: 'local cross-encoder narrows them' } ] },
      { label: 'Extract', nodes: [{ k: 'ai', t: 'Anthropic API', s: 'structured terms with citations' }] },
      { label: 'Verify', nodes: [
        { k: 'guard', t: 'Citation check in code', s: 'traced to the source sentence, or NOT FOUND' },
        { k: 'out', t: 'Cited terms', s: 'page + exact sentence, Angular UI' } ] },
    ],
    rails: [
      { k: 'guard', t: 'Eval harness', s: 'hand-labeled keys: 71% vs a 57% baseline on a 229-page SEC filing' },
    ],
  },
  layers: {
    name: 'LAYERS', kicker: 'AML detector benchmark on synthetic data',
    stages: [
      { label: 'Data', nodes: [{ k: 'src', t: 'IBM AML HI-Small', s: 'synthetic: 5M transactions, 515K accounts' }] },
      { label: 'Store', nodes: [{ k: 'store', t: 'PostgreSQL', s: 'least-privilege roles' }] },
      { label: 'Run', nodes: [{ k: 'proc', t: 'Job queue + worker', s: 'scores every transaction' }] },
      { label: 'Detect', nodes: [
        { k: 'proc', t: 'Rule-based baseline', s: '29% recall at a matched flag rate' },
        { k: 'ai', t: 'Graph method', s: 'NetworkX, 48% recall at the same rate' } ] },
      { label: 'Compare', nodes: [{ k: 'guard', t: 'Is the gap real?', s: 'bootstrap CIs, DeLong AUC tests, corrected p-values' }] },
      { label: 'Serve', nodes: [
        { k: 'proc', t: 'FastAPI', s: 'results API' },
        { k: 'out', t: 'React + D3', s: 'network view' } ] },
    ],
    rails: [
      { k: 'guard', t: 'CI', s: 'pip-audit, Bandit, 209 tests, non-root Docker images' },
    ],
  },
  sentinel: {
    name: 'SENTINEL', kicker: 'Economic indicator monitor on AWS',
    stages: [
      { label: 'Source', nodes: [{ k: 'src', t: 'FRED API', s: 'fed funds rate, CPI, unemployment' }] },
      { label: 'Pull', nodes: [{ k: 'proc', t: 'Daily Python job', s: 'fetches the 3 series' }] },
      { label: 'Store', nodes: [{ k: 'store', t: 'PostgreSQL', s: 'via SQLAlchemy' }] },
      { label: 'Check', nodes: [{ k: 'guard', t: 'Threshold rules', s: 'configured per series' }] },
      { label: 'Act', nodes: [
        { k: 'out', t: 'Alert', s: 'when a value moves past its threshold' },
        { k: 'proc', t: 'FastAPI', s: 'serves the data' } ] },
    ],
    rails: [
      { k: 'proc', t: 'Infra as code', s: 'Terraform: EC2, firewall rules, key pair. Docker on AWS EC2' },
      { k: 'guard', t: 'Deploy gate', s: 'GitHub Actions: the deploy job depends on the tests passing' },
    ],
  },
  pipeline: {
    name: 'Portfolio Analytics Pipeline', kicker: 'Unattended ELT, medallion pattern',
    stages: [
      { label: 'Trigger', nodes: [{ k: 'proc', t: 'Apache Airflow', s: 'every weekday at 6 PM' }] },
      { label: 'Extract', nodes: [{ k: 'src', t: 'Yahoo Finance', s: 'daily stock prices' }] },
      { label: 'Load', nodes: [{ k: 'store', t: 'PostgreSQL', s: 'raw prices land here' }] },
      { label: 'Transform', nodes: [{ k: 'proc', t: 'dbt: Bronze → Silver → Gold', s: 'star schema, 5 models, ROW_NUMBER() de-dup' }] },
      { label: 'Test', nodes: [{ k: 'guard', t: '26 data quality tests', s: 'check the output every run' }] },
      { label: 'Serve', nodes: [{ k: 'out', t: 'Metabase dashboard', s: 'picks up the result' }] },
    ],
    rails: [
      { k: 'proc', t: 'Docker', s: 'the whole stack runs in containers; reruns are idempotent' },
    ],
  },
  thrivekid: {
    name: 'ThriveKid', kicker: 'Full-stack PWA, Clean Architecture',
    stages: [
      { label: 'Client', nodes: [{ k: 'out', t: 'React 19 + TypeScript PWA', s: 'deployed on Vercel' }] },
      { label: 'Auth', nodes: [{ k: 'guard', t: 'JWT auth', s: 'refresh token rotation' }] },
      { label: 'API', nodes: [{ k: 'proc', t: 'ASP.NET Core, .NET 8', s: 'REST API with Swagger' }] },
      { label: 'Domain', nodes: [
        { k: 'proc', t: 'Recurring event engine', s: 'timezone-aware' },
        { k: 'ai', t: 'WHO growth charts', s: 'percentile tracking' } ] },
      { label: 'Data', nodes: [{ k: 'store', t: 'Entity Framework Core', s: 'data access layer' }] },
    ],
    rails: [
      { k: 'proc', t: 'Build', s: '3-layer Clean Architecture, Docker multi-stage builds, GitHub Actions CI' },
      { k: 'guard', t: 'Reviewed', s: '2 senior code reviews, 25+ issues fixed, 13-issue security audit' },
    ],
  },
};
