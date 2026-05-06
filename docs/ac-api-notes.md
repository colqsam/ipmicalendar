# ActiveCampaign API Probe Notes (Phase 2)

Date: 2026-05-06

## Probe status

I added `tools/probe-ac.js` to perform live shape verification against these endpoints:
- `GET /dealTasks` (list)
- `GET /deals/{id}/dealTasks`
- `GET /dealTasks/{id}`
- `POST /dealTasks`
- `PUT /dealTasks/{id}`
- `DELETE /dealTasks/{id}`
- `GET /users/{id}`

The script requires environment variables:
- `AC_API_KEY`
- `AC_TEST_DEAL_ID` (safe throwaway deal id)
- optional `AC_BASE_URL` (defaults to IPMI account base)

### Current local run result

Local run failed before network probe due to missing `AC_API_KEY` in this environment:

```
Missing AC_API_KEY env var
```

Because of that, **no endpoint shape assumptions were committed as facts** yet. Once env vars are provided, run:

```bash
node tools/probe-ac.js > docs/ac-probe-output.json
```

Then update this file with observed shapes and confirmed field names (especially owner assignment field on task create and completion update payload).
