# 삼한지몽 (三韓之夢) - Claude Code 개발 규칙

## 프로젝트 개요
- 게임명: 삼한지몽
- 장르: 2D 메트로배니아 액션 RPG
- 엔진: Phaser 3 + TypeScript
- 플레이어: 1~2인 로컬 Co-op

## 핵심 원칙

### 1. 코드 스타일
- TypeScript strict 모드 사용
- 함수/클래스에 JSDoc 주석 필수
- 파일당 하나의 클래스/모듈

### 2. 네이밍 규칙
```
파일명: kebab-case (예: player-controller.ts)
클래스: PascalCase (예: PlayerController)
함수/변수: camelCase (예: handleJump)
상수: UPPER_SNAKE_CASE (예: MAX_HEALTH)
인터페이스: I prefix (예: IEnemy)
타입: T prefix (예: TWeaponType)
```

### 3. 폴더 구조 규칙
```
/src
├── /assets        # 정적 리소스 (이미지, 오디오, JSON)
├── /scenes        # Phaser Scene 클래스
├── /entities      # 게임 오브젝트 (Player, Enemy, NPC)
├── /systems       # 게임 시스템 (Combat, Dialogue, Quest)
├── /ui            # UI 컴포넌트
├── /utils         # 유틸리티 함수
├── /types         # TypeScript 타입 정의
├── /state         # 게임 상태 관리
├── /config        # 게임 설정
└── /data          # 게임 데이터 (JSON)
```

### 4. Scene 작성 규칙
- 모든 Scene은 BaseScene 상속
- preload → create → update 순서

### 5. Entity 작성 규칙
- 모든 Entity는 Phaser.GameObjects 상속
- public 메서드 먼저, private 메서드 뒤에

### 6. 데이터 관리 규칙
- 게임 수치는 JSON 파일로 분리
- 하드코딩 금지

### 7. 상태 관리
- 전역 상태는 GameState 싱글톤 사용

### 8. 에러 처리
- try-catch 사용, Logger를 통한 에러 로깅

### 9. 커밋 메시지
```
feat: 새로운 기능
fix: 버그 수정
refactor: 리팩토링
docs: 문서 수정
style: 코드 포맷팅
test: 테스트 추가
chore: 기타 작업
```

## 금지 사항
- any 타입 사용 금지 (불가피한 경우 주석 필수)
- console.log 남발 금지 (Logger 사용)
- 매직 넘버 금지 (상수 정의 필수)
- 깊은 중첩 금지 (3단계 이상 시 함수 분리)
