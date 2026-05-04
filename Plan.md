# voice-agent Python/Agno Plan

## 목표

README의 VSCode 음성 코딩 Extension을 Python 중심 구조로 재작성한다. VSCode Extension은 입력과 실행 UI를 담당하고, Python `voice_agent` 패키지는 Agno 기반 Agent 계층과 명령 실행 계획 생성을 담당한다.

## Agno 검증 결과

- 공식 문서 기준 Agno SDK는 `Agent`, `Team`, `Workflow` 세 가지 프리미티브를 제공한다.
- `Agent`는 모델, 도구, instructions를 조합해 자율 실행 단위를 만든다.
- Agno 도구는 일반 Python 함수를 `tools=[...]`에 등록하는 방식으로 작성할 수 있다.
- PyPI 기준 현재 확인한 최신 Agno 버전은 `2.6.4`이며, 이 프로젝트는 `agno>=2.6,<3` 범위를 사용한다.

참고한 공식 문서:

- https://docs.agno.com/sdk/introduction
- https://docs.agno.com/tools/agent
- https://docs.agno.com/tools/overview

## 아키텍처

```text
VSCode Webview / Command Palette
  -> src/extension.js
  -> python -m voice_agent.cli --command "<natural language>"
  -> voice_agent.agent.VoiceAgent
  -> Agno Agent facade + deterministic local planner
  -> JSON tool plan
  -> src/toolLayer.js
  -> VSCode API 실행
```

## 역할 분리

- VSCode Extension
  - Web Speech API 또는 텍스트 입력을 받는다.
  - Python CLI를 호출한다.
  - JSON 실행 계획을 VSCode API tool layer로 실행한다.
  - 상태바, 알림, 웹뷰 출력, QR 패널을 제공한다.

- Python `voice_agent`
  - README에 있는 한국어 명령 예시를 안정적으로 파싱한다.
  - Agno `Agent` 구성 함수를 제공해 향후 LLM 기반 명령 해석으로 확장한다.
  - Agno가 설치되지 않았거나 모델 키가 없는 테스트 환경에서도 deterministic planner로 동작한다.
  - VSCode Extension이 실행할 수 있는 JSON tool plan을 출력한다.

## MVP 지원 명령

- `main.py 열어` -> `openFile`
- `새파일.py 만들어` -> `createFile`
- `33번 라인에 validate_user 함수 추가해` -> `insertAtLine`
- `화면 천천히 아래로 내려봐` -> `scroll`
- `잠깐 화면 크게 보여줘` -> `zoom`
- `저장해` -> `saveActiveFile`
- `터미널에서 npm test 실행` -> `runTerminalCommand`
- `현재 컨텍스트 보여줘` -> `readContext`

## 구현 체크리스트

1. Python 패키지와 CLI 작성
   - `pyproject.toml`
   - `voice_agent/models.py`
   - `voice_agent/agent.py`
   - `voice_agent/agno_runtime.py`
   - `voice_agent/cli.py`

2. VSCode Extension 브리지 수정
   - `src/pythonBridge.js`에서 Python CLI 호출
   - `src/extension.js`에서 Python plan을 실행
   - 기존 JS 파서는 fallback으로 유지

3. 테스트
   - Python planner unit test
   - Python CLI JSON contract test
   - Node fallback parser test
   - JS syntax/package validation

4. 남은 확장 과제
   - 실제 Codex/OpenAI 모델 연결
   - VSCode에서 Python interpreter 설정 UI
   - 위험 작업 승인 정책
   - 외부 입력 서버와 QR 세션 연결
   - diagnostics/git diff 기반 자동 검증 루프
