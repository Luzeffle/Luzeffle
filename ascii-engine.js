// Custom landscape asymmetrical spindle wave ASCII engine
// Renders native browser text strings inside HTML pre tags (Aino-style crispness)
// Implements the spill, "ANGELO" block letter formation, blooming branches, and zoom portal.

export class AsciiEngine {
  constructor(preId, onTransitionComplete) {
    this.pre = document.getElementById(preId);
    if (!this.pre) return;

    this.onTransitionComplete = onTransitionComplete;

    // Monospace grid sizing parameters
    this.charWidth = 7;
    this.charHeight = 11;
    this.cols = 0;
    this.rows = 0;
    this.width = 0;
    this.height = 0;

    // Lifecycle States
    this.STATE_LOADING = 0;
    this.STATE_BREATHING = 1;
    this.STATE_STANDBY = 2;
    this.STATE_SPILL = 3;
    this.STATE_SLIDE_DOWN = 4;
    this.STATE_COLLAPSE = 5;
    this.STATE_BRACKETS = 6;
    this.STATE_MOVE_LOGO = 7;
    this.currentState = this.STATE_LOADING;

    // Timings
    this.progress = 0;
    this.loadingDuration = 240; // ~4 seconds of loading line
    this.loadingFrame = 0;
    this.breathingDuration = 45; // ~0.7 seconds of hold pause
    this.breathingFrame = 0;
    this.morphFrame = 0; // Frame counter for smoothstep morph factor
    this.time = 0;
    this.morphFactor = 0;
    this.introActive = true; // Fix initialization bug

    // Transition Particles
    this.particles = [];
    this.transitionTimer = 0;
    this.lastFrameTime = 0;
    this.snapImpactTriggered = false;

    // Animation Durations (in milliseconds)
    // Tweak these values to change how long each animation phase takes
    this.durations = {
      collageHold: 2400, // Time (ms) collage is displayed (collage takes 2.2s to assemble + 200ms hold)
      nameStandby: 800,  // Time (ms) for the full name "Angelo Lozano" to stand still in the center before sliding down
      slideDown: 800,    // Time (ms) for lowercase letters to slide down and fade out
      collapse: 800,     // Time (ms) for "A" and "L" to collapse together
      brackets: 600,     // Time (ms) for brackets to snap on "AL"
      moveLogo: 1250     // Time (ms) for logo to glide to site-header
    };

    // Zoom and Scale Angle
    this.folderAngle = 0;
    this.folderScale = 1.0;

    // Mouse tracking for interactive physics
    this.mouseX = -1000;
    this.mouseY = -1000;

    this.config = {
      baseThickness: 0.0,
      fontFamily: "Consolas, Monaco, monospace",
      asciiScale: ["@", "#", "8", "&", "*", "+", "=", ":", "-", "."],
      primaryColor: "#ffffff",
    };

    // Cache DOM layers
    this.dom = {
      statusIndicator: document.querySelector(".status-indicator"),
      statusText: document.getElementById("intro-status-text"),
      introPrompt: document.getElementById("intro-prompt")
    };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Mouse movement listener mapped to character grid
    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX / this.charWidth;
      this.mouseY = e.clientY / this.charHeight;
    });

    // Clear mouse target if cursor leaves screen
    window.addEventListener("mouseleave", () => {
      this.mouseX = -1000;
      this.mouseY = -1000;
    });

    // Allow clicking anywhere in the intro container to transition
    const container = document.getElementById("intro-container");
    const clickTarget = container || this.pre;
    clickTarget.addEventListener("click", () => {
      if (this.currentState === this.STATE_STANDBY && this.morphFactor >= 0.95) {
        this.triggerTransition();
      }
    });

    this.animate();
  }

  resize() {
    if (!this.pre) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.cols = Math.floor(this.width / this.charWidth);
    this.rows = Math.floor(this.height / this.charHeight);
  }

  triggerImpactFrame() {
    document.body.style.filter = "invert(1)";
    setTimeout(() => {
      document.body.style.filter = "";
    }, 80);
  }

  triggerTransition() {
    this.currentState = this.STATE_SPILL;
    this.transitionTimer = 0;
    this.lastFrameTime = performance.now();
    this.snapImpactTriggered = false;
    this.pre.classList.remove("interactive");

    // High-contrast screen flash
    this.triggerImpactFrame();

    // Fade out ASCII pre quickly
    this.pre.style.transition = "opacity 0.2s ease";
    this.pre.style.opacity = "0";

    // Reveal DOM collage container and trigger slide-in transitions
    const collageContainer = document.getElementById("collage-container");
    if (collageContainer) {
      collageContainer.classList.remove("hide");
      requestAnimationFrame(() => {
        collageContainer.classList.add("collage-active");
      });
    }

    if (this.dom.introPrompt) {
      this.dom.introPrompt.textContent = "TACTIC RESONANCE COUPLING...";
      this.dom.introPrompt.classList.remove("active");
    }
  }



  getStandbyNodes(isMobile) {
    return isMobile ? [
      { center: 0, topH: this.rows * 0.22, width: this.cols * 0.08, freq: 1.2, phase: 0 }, // Center
      { center: -this.cols * 0.20, topH: this.rows * 0.09, width: this.cols * 0.04, freq: 1.8, phase: 1.0 }, // Flank Left
      { center: this.cols * 0.20, topH: this.rows * 0.11, width: this.cols * 0.04, freq: 1.8, phase: 1.0 }, // Flank Right
      { center: -this.cols * 0.36, topH: this.rows * 0.06, width: this.cols * 0.02, freq: 2.2, phase: 2.0 }, // Edge Left
      { center: this.cols * 0.36, topH: this.rows * 0.07, width: this.cols * 0.02, freq: 2.2, phase: 2.0 }  // Edge Right
    ] : [
      { center: 0, topH: this.rows * 0.32, width: this.cols * 0.06, freq: 1.0, phase: 0 }, // Center major
      { center: -this.cols * 0.12, topH: this.rows * 0.16, width: this.cols * 0.025, freq: 1.6, phase: 1.0 }, // Flanks
      { center: this.cols * 0.12, topH: this.rows * 0.18, width: this.cols * 0.025, freq: 1.6, phase: 1.0 },
      { center: -this.cols * 0.22, topH: this.rows * 0.10, width: this.cols * 0.018, freq: 2.0, phase: 2.0 }, // Secondaries
      { center: this.cols * 0.22, topH: this.rows * 0.12, width: this.cols * 0.018, freq: 2.0, phase: 2.0 },
      { center: -this.cols * 0.30, topH: this.rows * 0.06, width: this.cols * 0.014, freq: 2.6, phase: 3.0 }, // Edge Dots
      { center: this.cols * 0.30, topH: this.rows * 0.07, width: this.cols * 0.014, freq: 2.6, phase: 3.0 }
    ];
  }

  animate() {
    if (!this.introActive) return;

    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    if (!this.lastFrameTime) this.lastFrameTime = now;
    const deltaMs = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Lifecycle State Ticker Actions
    if (this.currentState === this.STATE_LOADING) {
      this.loadingFrame++;
      // Cubic ease-in-out for smooth loading line expansion
      const t = this.loadingFrame / this.loadingDuration;
      const easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.progress = Math.min(100, easedT * 100);

      if (this.progress >= 100) {
        this.currentState = this.STATE_BREATHING;
      }
    } else if (this.currentState === this.STATE_BREATHING) {
      this.breathingFrame++;
      if (this.breathingFrame >= this.breathingDuration) {
        this.currentState = this.STATE_STANDBY;
        if (this.dom.statusIndicator) this.dom.statusIndicator.classList.add("ready");
        if (this.dom.statusText) this.dom.statusText.textContent = "SYSTEMS ONLINE";
        if (this.dom.introPrompt) {
          this.dom.introPrompt.textContent = "CLICK ANYWHERE TO ENTER";
          this.dom.introPrompt.classList.add("active");
        }
        this.pre.classList.add("interactive");
      }
    } else if (this.currentState === this.STATE_STANDBY) {
      // Smoothstep morph opening bloom ease-in-out
      this.morphFrame = Math.min(60, this.morphFrame + 1);
      const t = this.morphFrame / 60;
      this.morphFactor = t * t * (3 - 2 * t);
    } else {
      this.transitionTimer += deltaMs;
    }

    this.time += 0.012; // Wave tick
    const centerYRow = Math.floor(this.rows / 2);
    const centerXCol = Math.floor(this.cols / 2);
    const isMobile = this.width < 768;

    // Initialize blank grid screen buffer map
    let screen = Array(this.rows).fill(null).map(() => Array(this.cols).fill(" "));

    // --- MODE 1: Horizontal Loader and Standby Wave (Underline Only) ---
    if (this.currentState <= this.STATE_STANDBY) {
      const progressCols = Math.floor((this.progress / 100) * this.cols);
      const nodes = this.getStandbyNodes(isMobile);

      for (let c = 0; c < this.cols; c++) {
        // Draw loading line during loading state
        if (this.currentState === this.STATE_LOADING) {
          if (c <= progressCols) {
            if (centerYRow >= 0 && centerYRow < this.rows) {
              screen[centerYRow][c] = "─";
            }
          }
          continue;
        }

        // Draw baseline line during breathing pause
        if (this.currentState === this.STATE_BREATHING) {
          if (centerYRow >= 0 && centerYRow < this.rows) {
            screen[centerYRow][c] = "─";
          }
          continue;
        }

        // Draw baseline and wave spikes during standby (Symmetrical above and below)
        const dx = c - centerXCol;
        let topEnvelope = 0;
        nodes.forEach(n => {
          const decay = Math.exp(-Math.abs(dx - n.center) / n.width);
          const pulse = 1.0 + 0.12 * Math.sin(this.time * n.freq + n.phase);
          topEnvelope += n.topH * decay * pulse;
        });

        if (topEnvelope < 1.8) topEnvelope *= 0.15;

        const jaggedNoise = Math.sin(dx * (isMobile ? 0.45 : 0.35) - this.time * 9.0) * Math.sin(dx * 0.08) * 1.5;
        const standbyTopLimit = Math.max(0, topEnvelope + jaggedNoise * Math.min(1.0, topEnvelope));
        const currentTopLimit = standbyTopLimit * this.morphFactor;

        // Symmetrical wave heights
        let activeRowsHeight = Math.floor(currentTopLimit);

        // Calculate mouse interaction / repulsion for standby wave parting
        let cRendered = c;
        if (this.mouseX >= 0 && this.mouseY >= 0) {
          const distToMouseX = Math.abs(c - this.mouseX);
          const distToMouseY = Math.abs(centerYRow - this.mouseY);

          if (distToMouseX < 16 && distToMouseY < 20) {
            const proximityX = 1.0 - (distToMouseX / 16);
            const proximityY = 1.0 - (distToMouseY / 20);
            const totalProximity = proximityX * proximityY;

            const shift = Math.round(totalProximity * 6);
            if (c < this.mouseX) {
              cRendered = Math.max(0, c - shift);
            } else {
              cRendered = Math.min(this.cols - 1, c + shift);
            }

            activeRowsHeight = Math.floor(activeRowsHeight * (1.0 - totalProximity * 0.8));
          }
        }

        // 1. Center horizontal line (Underline)
        if (centerYRow >= 0 && centerYRow < this.rows && cRendered >= 0 && cRendered < this.cols) {
          screen[centerYRow][cRendered] = "─";
        }

        // 2. Draw Wave Spikes wiggling symmetrically above and below centerYRow
        if (activeRowsHeight > 0) {
          for (let cellRowOffset = 1; cellRowOffset <= activeRowsHeight; cellRowOffset++) {
            const rTop = centerYRow - cellRowOffset;
            const rBottom = centerYRow + cellRowOffset;
            const ratio = cellRowOffset / activeRowsHeight;
            const glyphIndex = Math.min(
              this.config.asciiScale.length - 1,
              Math.floor(ratio * 3.5 + 2)
            );
            const char = this.config.asciiScale[glyphIndex];

            if (rTop >= 0 && rTop < this.rows && cRendered >= 0 && cRendered < this.cols) {
              screen[rTop][cRendered] = char;
            }
            if (rBottom >= 0 && rBottom < this.rows && cRendered >= 0 && cRendered < this.cols) {
              screen[rBottom][cRendered] = char;
            }
          }
        }
      }
    }

    // --- MODE 2: Cinematic Transition Sequence (Spill -> Slide Down -> Collapse -> Brackets -> Move Logo) ---
    else {
      // Manage Phase Switches and Active State Updates
      if (this.currentState === this.STATE_SPILL) {
        if (this.transitionTimer > this.durations.collageHold) {
          this.currentState = this.STATE_SLIDE_DOWN;
          this.transitionTimer = 0;

          // Fade out / slide away collage container
          const collageContainer = document.getElementById("collage-container");
          if (collageContainer) {
            collageContainer.classList.add("collage-fade-out");
          }

          // Reveal DOM logo container (Name pops up in full)
          const animContainer = document.getElementById("logo-animation-container");
          if (animContainer) {
            animContainer.classList.remove("hide");
            animContainer.classList.add("name-active");
          }
        }
      }

      else if (this.currentState === this.STATE_SLIDE_DOWN) {
        // At nameStandby, start sliding down lowercase letters
        if (this.transitionTimer >= this.durations.nameStandby && !document.getElementById("logo-animation-container").classList.contains("slide-down-active")) {
          const animContainer = document.getElementById("logo-animation-container");
          if (animContainer) {
            animContainer.classList.add("slide-down-active");
          }
        }

        // Wait for lowercase letters to slide down fully (nameStandby + slideDown)
        if (this.transitionTimer > (this.durations.nameStandby + this.durations.slideDown)) {
          this.currentState = this.STATE_COLLAPSE;
          this.transitionTimer = 0;

          const animContainer = document.getElementById("logo-animation-container");
          if (animContainer) {
            animContainer.classList.add("collapsing");
          }
        }
      }

      else if (this.currentState === this.STATE_COLLAPSE) {
        if (this.transitionTimer > this.durations.collapse) {
          this.currentState = this.STATE_BRACKETS;
          this.transitionTimer = 0;
          this.snapImpactTriggered = false; // Reset trigger flag for brackets snap

          const animContainer = document.getElementById("logo-animation-container");
          if (animContainer) {
            animContainer.classList.add("bracket-snap");
          }
        }
      }

      else if (this.currentState === this.STATE_BRACKETS) {
        // Trigger snap impact frame flash exactly once when brackets slam together
        if (!this.snapImpactTriggered) {
          this.triggerImpactFrame();
          this.snapImpactTriggered = true;
        }

        if (this.transitionTimer > this.durations.brackets) {
          this.currentState = this.STATE_MOVE_LOGO;
          this.transitionTimer = 0;

          // Make intro container transparent and reveal main portfolio page to cross-fade
          const introContainer = document.getElementById("intro-container");
          if (introContainer) {
            introContainer.style.backgroundColor = "transparent";
          }
          const portfolioContainer = document.getElementById("portfolio-container");
          if (portfolioContainer) {
            portfolioContainer.classList.remove("hide");
          }

          // Measure and set landed target variables on logo container
          const domLogo = document.querySelector(".logo-symbol");
          const animContainer = document.getElementById("logo-animation-container");
          if (domLogo && animContainer) {
            const rect = domLogo.getBoundingClientRect();
            const initialRect = animContainer.getBoundingClientRect();

            const targetCenterX = rect.left + rect.width / 2;
            const targetCenterY = rect.top + rect.height / 2;

            const translateX = targetCenterX - window.innerWidth / 2;
            const translateY = targetCenterY - window.innerHeight / 2;

            const scale = rect.height / initialRect.height;

            animContainer.style.setProperty("--logo-translate-x", `${translateX}px`);
            animContainer.style.setProperty("--logo-translate-y", `${translateY}px`);
            animContainer.style.setProperty("--logo-target-scale", scale);

            animContainer.classList.add("landed");
          }
        }
      }

      else if (this.currentState === this.STATE_MOVE_LOGO) {
        if (this.transitionTimer > this.durations.moveLogo) {
          this.introActive = false;
          if (this.onTransitionComplete) {
            this.onTransitionComplete();
          }
        }
      }
    }

    // Assemble text screen matrix buffer to string output (Only during active ASCII loading/standby)
    if (this.currentState <= this.STATE_STANDBY) {
      let outputString = "";
      for (let r = 0; r < this.rows; r++) {
        outputString += screen[r].join("") + "\n";
      }
      this.pre.textContent = outputString;
    }
  }
}
