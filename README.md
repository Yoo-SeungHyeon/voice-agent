# voice-agent

목소리로 VSCode에서 코딩하고, 편집하고, 탐색하는 AI Extension입니다.

## 목표

`voice-agent`는 사용자가 자연어 음성 명령을 말하면 Codex 중심 Agent가 의도를 해석하고, VSCode API로 만든 도구를 호출해 에디터 안의 행동을 즉시 수행하는 것을 목표로 합니다.

예를 들어 다음과 같은 명령을 지원하는 Extension을 지향합니다.

- `main.py 열어`
- `화면 천천히 아래로 내려봐`
- `잠깐 화면 크게 보여줘`
- `33번 라인에 OOO 함수 추가해`

## 핵심 컨셉: 전권 실행 모드

이 Extension은 사용자가 호출한 뒤에는 AI가 별도 확인 없이 VSCode에서 가능한 동작을 바로 수행할 수 있는 전권 실행 모드를 전제로 합니다.

즉, Agent는 단순히 답변을 생성하는 역할이 아니라 파일을 열고, 코드를 수정하고, 터미널을 실행하고, 현재 화면 상태를 읽는 실행 주체가 됩니다. 삭제, 외부 명령 실행, 비밀정보 노출처럼 위험도가 큰 작업은 향후 정책 레이어에서 다룰 수 있지만, 제품의 기본 경험은 빠른 음성 기반 자동 실행에 맞춥니다.

## 주요 기능

- 파일과 탭 제어: 파일 열기, 생성, 저장, 검색, 열린 탭 전환
- 에디터 제어: 커서 이동, 라인 이동, 선택 영역 수정, 스크롤, 확대/축소
- 코드 편집: 특정 라인에 코드 추가, 선택 영역 리팩터링, 함수 생성, import 정리
- VSCode 명령 실행: command palette 동작, extension command 실행
- 터미널 제어: 터미널 생성, 명령 실행, 출력 읽기
- 화면/컨텍스트 읽기: 현재 파일, 선택 영역, diagnostics, git 상태, 열린 workspace 정보 읽기
- QR 기반 연결: 모바일 음성 입력 또는 외부 디바이스와 VSCode Extension 연결

## 기술 방향

이 프로젝트는 VSCode Extension, Agno Agent, Codex, VSCode API tool layer를 조합해 구현합니다.

### VSCode Extension

사용자 입력과 에디터 실행 환경을 담당합니다.

- 음성 입력을 받아 Agent에 전달
- VSCode API를 사용해 실제 편집기 동작 수행
- 실행 결과를 상태바, 알림, 패널, 하이라이트 등으로 피드백

### Agno Agent

Agent orchestration과 도구 호출 흐름을 담당합니다.

- 음성 명령을 실행 가능한 작업 계획으로 변환
- Codex를 중심 추론 모델로 호출
- VSCode API 도구를 선택하고 순서대로 실행
- 실행 결과를 바탕으로 다음 행동을 이어감

### Codex

중심 AI 모델로 사용합니다.

- 자연어 명령 해석
- 코드 변경안 생성
- 현재 파일/프로젝트 컨텍스트 기반 판단
- 여러 VSCode 도구를 조합한 작업 수행

### VSCode API Tool Layer

VSCode에서 가능한 행동을 Agent가 호출할 수 있는 도구로 감쌉니다.

| 도구 범주 | 예시 |
| --- | --- |
| Workspace/File tools | 파일 열기, 파일 생성, 저장, 검색 |
| Editor tools | 커서 이동, 라인 편집, 선택 영역 수정, 스크롤, 줌 |
| Command tools | VSCode command 실행, command palette 동작 |
| Terminal tools | 터미널 생성, 명령 실행, 출력 읽기 |
| Context tools | 현재 파일, 선택 영역, 열린 탭, diagnostics, git 상태 읽기 |

## MVP 로드맵

1. 음성 입력 파이프라인 구축
   - Extension에서 음성 입력을 텍스트 명령으로 변환합니다.
   - 초기 버전은 직접 텍스트 입력도 함께 지원해 Agent 동작을 먼저 검증합니다.

2. 명령 파싱과 Agent 실행 루프 구현
   - Agno Agent가 사용자 명령을 해석합니다.
   - Codex가 현재 VSCode 컨텍스트를 바탕으로 수행할 작업을 결정합니다.

3. VSCode API 도구화
   - 파일 열기, 커서 이동, 라인 편집, 스크롤, 줌 같은 기본 동작부터 도구로 제공합니다.
   - 도구 호출 결과를 Agent에 다시 전달해 연속 작업이 가능하게 합니다.

4. 코드 편집 기능 확장
   - 특정 라인 수정, 함수 추가, 선택 영역 리팩터링, import 정리 같은 코딩 작업을 지원합니다.
   - diagnostics와 git diff를 읽어 수정 결과를 검토할 수 있게 합니다.

5. 피드백 UI 추가
   - 현재 Agent가 수행 중인 명령, 호출한 도구, 성공/실패 상태를 VSCode 안에서 보여줍니다.
   - 음성 명령이 잘못 인식됐을 때 사용자가 즉시 파악할 수 있도록 합니다.

6. QR 기반 연결 확장
   - 모바일 또는 외부 디바이스에서 음성 입력을 보내는 흐름을 추가합니다.
   - QR 코드로 VSCode Extension 세션과 외부 입력 장치를 연결합니다.

## 사용 예시

```text
사용자: main.py 열어
Agent: workspace에서 main.py를 찾고 active editor로 엽니다.

사용자: 33번 라인에 validate_user 함수 추가해
Agent: 현재 파일 컨텍스트를 읽고 33번 라인에 함수 구현을 삽입합니다.

사용자: 화면 천천히 아래로 내려봐
Agent: editor scroll API 또는 VSCode command를 호출해 화면을 아래로 이동합니다.
```

## 현재 상태

현재는 프로젝트 방향과 아키텍처를 정리하는 초기 단계입니다. 다음 단계는 VSCode Extension scaffold를 만들고, 가장 작은 VSCode API tool set부터 Agno Agent에 연결하는 것입니다.
