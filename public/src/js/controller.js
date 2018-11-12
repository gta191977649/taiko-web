class Controller{
	constructor(selectedSong, songData, autoPlayEnabled, multiplayer, touchEnabled){
		this.selectedSong = selectedSong
		this.songData = songData
		this.autoPlayEnabled = autoPlayEnabled
		this.multiplayer = multiplayer
		this.touchEnabled = touchEnabled
		this.snd = this.multiplayer ? "_p" + this.multiplayer : ""
		
		var backgroundURL = gameConfig.songs_baseurl + this.selectedSong.folder + "/bg.png"
		
		if(selectedSong.type === "tja"){
			this.parsedSongData = new ParseTja(songData, selectedSong.difficulty, selectedSong.offset)
		}else{
			this.parsedSongData = new ParseOsu(songData, selectedSong.offset)
		}
		this.offset = this.parsedSongData.soundOffset
		
		assets.songs.forEach(song => {
			if(song.id == this.selectedSong.folder){
				this.mainAsset = song.sound
			}
		})
		
		this.game = new Game(this, this.selectedSong, this.parsedSongData)
		this.view = new View(this, backgroundURL, this.selectedSong.title, this.selectedSong.difficulty)
		this.mekadon = new Mekadon(this, this.game)
		this.keyboard = new Keyboard(this)
		
		this.playedSounds = {}
	}
	run(syncWith){
		this.game.run()
		this.view.run()
		this.startMainLoop()
		if(syncWith){
			syncWith.run()
			syncWith.game.elapsedTime = this.game.elapsedTime
			syncWith.game.startDate = this.game.startDate
			this.syncWith = syncWith
		}
		if(!this.multiplayer){
			debugObj.controller = this
			if(debugObj.debug){
				debugObj.debug.updateStatus()
			}
		}
	}
	startMainLoop(){
		this.mainLoopStarted = false
		this.mainLoopRunning = true
		this.mainLoop()
	}
	stopMainLoop(){
		this.mainLoopRunning = false
		this.mainAsset.stop()
	}
	mainLoop(){
		if(this.mainLoopRunning){
			if(this.multiplayer !== 2){
				requestAnimationFrame(() => {
					if(this.syncWith){
						this.syncWith.game.elapsedTime = this.game.elapsedTime
						this.syncWith.game.startDate = this.game.startDate
					}
					this.mainLoop()
					if(this.syncWith){
						this.syncWith.mainLoop()
					}
					
					if(this.scoresheet){
						if(this.view.ctx){
							this.view.ctx.save()
							this.view.ctx.setTransform(1, 0, 0, 1, 0, 0)
						}
						this.scoresheet.redraw()
						if(this.view.ctx){
							this.view.ctx.restore()
						}
					}
				})
			}
			var ms = this.game.elapsedTime
			
			if(!this.game.isPaused()){
				this.keyboard.checkGameKeys()
				
				if(ms >= 0 && !this.mainLoopStarted){
					this.mainLoopStarted = true
				}
				if(ms < 0){
					this.game.updateTime()
				}
				if(this.mainLoopStarted){
					this.game.update()
					if(!this.mainLoopRunning){
						return
					}
					this.game.playMainMusic()
				}
			}
			this.view.refresh()
			this.keyboard.checkMenuKeys()
		}
	}
	gameEnded(){
		var score = this.getGlobalScore()
		var vp
		if(Math.round(score.gauge / 2) - 1 >= 25){
			if(score.bad === 0){
				vp = "fullcombo"
				this.playSoundMeka("fullcombo", 1.350)
			}else{
				vp = "clear"
			}
		}else{
			vp = "fail"
		}
		this.playSound("game" + vp)
	}
	displayResults(){
		if(this.multiplayer !== 2){
			this.scoresheet = new Scoresheet(this, this.getGlobalScore(), this.multiplayer, this.touchEnabled)
		}
	}
	displayScore(score, notPlayed, bigNote){
		this.view.displayScore(score, notPlayed, bigNote)
	}
	songSelection(fadeIn){
		if(!fadeIn){
			this.clean()
		}
		new SongSelect(false, fadeIn, this.touchEnabled)
	}
	restartSong(){
		this.clean()
		if(this.multiplayer){
			new loadSong(this.selectedSong, false, true, this.touchEnabled)
		}else{
			loader.changePage("game")
			var taikoGame = new Controller(this.selectedSong, this.songData, this.autoPlayEnabled, false, this.touchEnabled)
			taikoGame.run()
		}
	}
	playSound(id, time){
		var ms = (+new Date) + (time || 0) * 1000
		if(!(id in this.playedSounds) || ms > this.playedSounds[id] + 30){
			assets.sounds[id + this.snd].play(time)
			this.playedSounds[id] = ms
		}
	}
	playSoundMeka(soundID, time){
		var meka = ""
		if(this.autoPlayEnabled && !this.multiplayer){
			meka = "-meka"
		}
		this.playSound(soundID + meka, time)
	}
	togglePause(){
		if(this.syncWith){
			this.syncWith.game.togglePause()
		}
		this.game.togglePause()
	}
	getKeys(){
		return this.keyboard.getKeys()
	}
	setKey(keyCode, down, ms){
		return this.keyboard.setKey(keyCode, down, ms)
	}
	getBindings(){
		return this.keyboard.getBindings()
	}
	getElapsedTime(){
		return this.game.elapsedTime
	}
	getCircles(){
		return this.game.getCircles()
	}
	getCurrentCircle(){
		return this.game.getCurrentCircle()
	}
	isWaiting(key, type){
		return this.keyboard.isWaiting(key, type)
	}
	waitForKeyup(key, type){
		this.keyboard.waitForKeyup(key, type)
	}
	getKeyTime(){
		return this.keyboard.getKeyTime()
	}
	getCombo(){
		return this.game.getCombo()
	}
	getGlobalScore(){
		return this.game.getGlobalScore()
	}
	autoPlay(circle){
		if(this.multiplayer){
			p2.play(circle, this.mekadon)
		}else{
			this.mekadon.play(circle)
		}
	}
	clean(){
		if(this.syncWith){
			this.syncWith.clean()
		}
		this.stopMainLoop()
		this.keyboard.clean()
		this.view.clean()
		
		if(!this.multiplayer){
			debugObj.controller = null
			if(debugObj.debug){
				debugObj.debug.updateStatus()
			}
		}
	}
}
