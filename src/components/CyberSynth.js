export default class CyberSynth {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.droneOsc = null
    this.droneGain = null
    this.filterNode = null
    this.analyser = null
    this.sequenceTimer = null
    this.isPlaying = false

    // Curated futuristic chord note frequencies (A minor 9th / C Major 7th cyber scale)
    this.scale = [110.00, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00] // A2, C3, D3, E3, G3, A3, C4, D4, E4, G4, A4
  }

  init() {
    if (this.ctx) return
    const AudioContext = window.AudioContext || window.webkitAudioContext
    this.ctx = new AudioContext()

    // Master filter and gain pipeline
    this.filterNode = this.ctx.createBiquadFilter()
    this.filterNode.type = 'lowpass'
    this.filterNode.frequency.setValueAtTime(450, this.ctx.currentTime)
    this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime)

    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 64

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime)

    // Wire: Synth nodes -> Filter -> Analyser -> MasterGain -> Destination
    this.filterNode.connect(this.analyser)
    this.analyser.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)
  }

  start() {
    this.init()
    if (this.isPlaying) return
    
    if (this._disconnectTimer) { clearTimeout(this._disconnectTimer); this._disconnectTimer = null }
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    this.isPlaying = true
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
    this.masterGain.gain.linearRampToValueAtTime(0.38, this.ctx.currentTime + 0.5) // Clean fade-in

    // 1. Establish deep breathing ambient drone oscillator
    this.droneOsc = this.ctx.createOscillator()
    this.droneOsc.type = 'sawtooth'
    this.droneOsc.frequency.setValueAtTime(55.00, this.ctx.currentTime) // A1 deep sub-bass

    this.droneGain = this.ctx.createGain()
    this.droneGain.gain.setValueAtTime(0.08, this.ctx.currentTime)

    // Modulate filter cutoff dynamically with slow LFO for warm breathing feel
    const lfo = this.ctx.createOscillator()
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime) // 0.2 Hz slow sweep

    const lfoGain = this.ctx.createGain()
    lfoGain.gain.setValueAtTime(250, this.ctx.currentTime) // Modulate up to 250Hz

    lfo.connect(lfoGain)
    lfoGain.connect(this.filterNode.frequency)

    this.droneOsc.connect(this.droneGain)
    this.droneGain.connect(this.filterNode)

    lfo.start()
    this.droneOsc.start()
    this.activeLfo = lfo

    // 2. Start procedurally arpeggiating retro plucked chords sequencer
    let stepCount = 0
    const intervalTime = 400 // ms per pluck node step

    const playSequenceStep = () => {
      if (!this.isPlaying) return

      // Choose a scale note based on procedurally pseudo-random offsets
      const noteIndex = Math.floor(Math.random() * this.scale.length)
      const freq = this.scale[noteIndex]

      // Create transient pluck synth node
      const pluckOsc = this.ctx.createOscillator()
      const pluckGain = this.ctx.createGain()

      pluckOsc.type = 'triangle'
      pluckOsc.frequency.setValueAtTime(freq, this.ctx.currentTime)

      pluckGain.gain.setValueAtTime(0.24, this.ctx.currentTime)
      // Exponential exponential decay pluck envelope
      pluckGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.78)

      pluckOsc.connect(pluckGain)
      pluckGain.connect(this.filterNode)

      pluckOsc.start()
      pluckOsc.stop(this.ctx.currentTime + 0.8)

      stepCount++
      this.sequenceTimer = setTimeout(playSequenceStep, intervalTime)
    }

    playSequenceStep()
  }

  stop() {
    if (!this.isPlaying) return
    this.isPlaying = false

    if (this.sequenceTimer) {
      clearTimeout(this.sequenceTimer)
      this.sequenceTimer = null
    }

    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
      this.masterGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4)
    }

    this._disconnectTimer = setTimeout(() => {
      this._disconnectTimer = null
      try {
        if (this.droneOsc) {
          this.droneOsc.stop()
          this.droneOsc.disconnect()
          this.droneOsc = null
        }
        if (this.activeLfo) {
          this.activeLfo.stop()
          this.activeLfo.disconnect()
          this.activeLfo = null
        }
        if (this.droneGain) {
          this.droneGain.disconnect()
          this.droneGain = null
        }
      } catch (e) {}
    }, 450)
  }

  getAnalyser() {
    this.init()
    return this.analyser
  }
}
