console.log("run game.js");

const STATE = {
  READY: 0,
  PLAY: 1,
  GAMEOVER: 2,
};

const PLAYER_SPEED = 250;

class MainScene extends Phaser.Scene {
  constructor() {
    super();

    this.player; // 1) 플레이어 변수 추가
    this.cursorKeys; // 키보드 입력 변수
    this.gameScore; // 시간 변수
    this.gameState = STATE.READY; // 게임 상태 변수: 초기값 READY

    this.enemySpeed = 100; // 초기 적 속도
    this.spawnRate = 2000; // 초기 스폰 빈도 (2초마다)
    this.highScore = localStorage.getItem("highScore")
      ? parseInt(localStorage.getItem("highScore"))
      : 0;
  }

  // 에셋 로드 영역
  preload() {
    // 2) 플레이어 그래픽을 생성한다. 0x00ff00 색상으로 가로20, 세로20 만큼의 원으로 만든다.
    let playser = this.make
      .graphics()
      .fillStyle(0x00ff00)
      .fillCircle(10, 10, 10, 10);
    // 3) 플레이어 그래픽을 'player'라는 이름의 Texture로 생성한다.
    playser.generateTexture("player", 20, 20);
    this.load.image("playerImage", "assets/ship.png");
    this.load.image("background", "assets/backgroung.png");

    // 4) 플레이어 그래픽을 파괴한다.
    playser.destroy();

    let enemyGraphic = this.make
      .graphics()
      .fillStyle(0xff0000)
      .fillCircle(5, 5, 5);
    enemyGraphic.generateTexture("enemy", 10, 10);
    enemyGraphic.destroy();
  }

  // 게임 오브젝트를 만드는 영역
  create() {
    let bg = this.add.image(0, 0, "background").setOrigin(0, 0);

    let scaleX = this.cameras.main.width / bg.width;
    let scaleY = this.cameras.main.height / bg.height;
    let scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);

    // 5) 플레이어 오브젝트를 250, 250 위치에 생성한다.
    this.player = this.physics.add
      .image(250, 250, "playerImage")
      .setScale(0.05); // 0.05는 이미지 크기

    this.player.setCollideWorldBounds(true);
    this.cursorKeys = this.input.keyboard.createCursorKeys();

    this.gameScore = 0;

    this.textScore = this.add.text(10, 10, `시간 : ${this.gameScore}s`, {
      fontSize: "20px",
      fill: "#fff",
    });

    this.textHighScore = this.add.text(
      350,
      10,
      `최고기록 : ${this.highScore}s`,
      {
        fontSize: "20px",
        fill: "#fff",
      }
    );

    this.textReady = this.add.text(100, 300, "space를 눌러 잔소리를 피하세요", {
      fontSize: "20px",
      fill: "#fff",
    });

    this.textGameOver = this.add.text(
      150,
      250,
      `잔소리에 맞았습니다: ${this.gameScore}s`,
      {
        fontSize: "20px",
        fill: "#fff",
      }
    );
    this.textGameOver.visible = false;

    this.textRestart = this.add.text(150, 300, "space를 눌러 재시작", {
      fontSize: "20px",
      fill: "#fff",
    });
    this.textRestart.visible = false;

    this.time.addEvent({
      delay: 1000, // 시간 단위 ms
      callback: () => {
        if (this.gameState === STATE.PLAY) this.gameScore++;
      }, // delay 주기마다 수행할 로직
      callbackScope: this, // callback 범위
      loop: true, // 반복 여부
    });

    // 적 그룹 생성
    this.time.addEvent({
      delay: 1000, // 1초마다
      callback: () => {
        if (this.gameState === STATE.PLAY && this.gameScore % 2 === 0) {
          // this.enemySpeed += 10;
          this.enemySpeed = Math.min(this.enemySpeed + 10, 300);
          this.spawnRate = Math.max(this.spawnRate - 50, 500);

          // 기존의 적 스폰 이벤트를 제거
          if (this.enemySpawnEvent) {
            this.enemySpawnEvent.remove();
          }

          // 새로운 스폰 빈도로 적 스폰 이벤트를 다시 생성
          this.enemySpawnEvent = this.time.addEvent({
            delay: this.spawnRate,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true,
          });
        }
      },
      callbackScope: this,
      loop: true,
    });

    this.enemies = this.physics.add.group(); // 적 그룹 생성

    // 충돌 처리
    this.physics.add.collider(
      this.player,
      this.enemies,
      this.gameOver,
      null,
      this
    );
  }

  update() {
    this.player.setVelocity(0);
    this.textScore.setText(`시간 : ${this.gameScore}s`);
    this.textHighScore.setText(`최고기록 : ${this.highScore}s`);
    this.textGameOver.setText(`잔소리에 맞았습니다: ${this.gameScore}s`);

    if (this.gameState === STATE.READY) {
      if (this.cursorKeys.space.isDown) {
        this.gameState = STATE.PLAY;
        this.textReady.visible = false;
      }
    }

    if (this.gameState === STATE.PLAY) {
      // update 메서드 내:
      if (this.gameScore % 10 === 0 && !this.hasUpdatedSpawnRate) {
        this.enemySpeed += 10;
        this.spawnRate = Math.max(this.spawnRate - 100, 500);

        if (this.enemySpawnEvent) {
          this.enemySpawnEvent.remove();
        }

        this.enemySpawnEvent = this.time.addEvent({
          delay: this.spawnRate,
          callback: this.spawnEnemy,
          callbackScope: this,
          loop: true,
        });

        this.hasUpdatedSpawnRate = true;
      } else if (this.gameScore % 10 !== 0) {
        this.hasUpdatedSpawnRate = false;
      }
    }

    if (this.gameState === STATE.GAMEOVER) {
      this.textRestart.visible = true; // 다시 시작하라는 메시지를 보이게 함
      if (this.cursorKeys.space.isDown) {
        this.restartGame();
      }
    }

    if (this.gameState === STATE.READY || this.gameState === STATE.GAMEOVER)
      return;

    if (this.cursorKeys.up.isDown) {
      this.player.setVelocityY(-PLAYER_SPEED);
    } else if (this.cursorKeys.down.isDown) {
      this.player.setVelocityY(PLAYER_SPEED);
    }

    if (this.cursorKeys.left.isDown) {
      this.player.setVelocityX(-PLAYER_SPEED);
    } else if (this.cursorKeys.right.isDown) {
      this.player.setVelocityX(PLAYER_SPEED);
    }
  }

  spawnEnemy() {
    // 기본적으로 생성할 적의 수
    let baseEnemyCount = 2;

    // 게임 점수에 따라 추가로 생성될 적의 수
    // 예: 10점마다 적 1마리 추가
    let additionalEnemies = Math.floor(this.gameScore / 5);

    // 총 생성할 적의 수
    const enemyCount = baseEnemyCount + additionalEnemies;

    for (let i = 0; i < enemyCount; i++) {
      let x, y;
      switch (
        Phaser.Math.Between(0, 3) // 0: 위, 1: 오른쪽, 2: 아래, 3: 왼쪽
      ) {
        case 0:
          x = Phaser.Math.Between(0, 500);
          y = 0;
          break;
        case 1:
          x = 500;
          y = Phaser.Math.Between(0, 500);
          break;
        case 2:
          x = Phaser.Math.Between(0, 500);
          y = 500;
          break;
        case 3:
          x = 0;
          y = Phaser.Math.Between(0, 500);
          break;
      }

      if (this.gameState === STATE.PLAY) {
        let enemy = this.enemies.create(x, y, "enemy");
        this.physics.moveToObject(enemy, this.player, this.enemySpeed);
      }
    }
  }

  gameOver() {
    this.gameState = STATE.GAMEOVER;
    this.textGameOver.visible = true;

    if (this.gameScore > this.highScore) {
      this.highScore = this.gameScore;
      // localStorage에 최고 기록 저장
      localStorage.setItem("highScore", this.highScore.toString());
    }
  }

  restartGame() {
    // 적들을 제거
    this.enemies.clear(true, true);

    // 변수 초기화
    this.gameScore = 0;
    this.enemySpeed = 100;
    this.spawnRate = 2000;
    this.gameState = STATE.READY;
    this.textGameOver.visible = false;
    this.textRestart.visible = false;
    this.textReady.visible = true;

    // 플레이어 위치 초기화
    this.player.setPosition(250, 250);
  }
}

const config = {
  type: Phaser.AUTO, // 게임 타입
  width: 500, // 가로
  height: 500, // 세로
  parent: "game", // 게임을 그릴 영역 id
  backgroundColor: "#000000", // 배경 색 RGB
  // 물리 설정. 충돌 처리 등에 사용
  physics: {
    default: "arcade", // 아케이드 게임
    arcade: {
      debug: false, // 디버그 모드 설정
    },
  },
  scene: MainScene, // 게임 Scene
};

let game = new Phaser.Game(config);
