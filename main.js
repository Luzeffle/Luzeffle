// main.js - Core Orchestrator for Angelo Lozano's Creative Portfolio
// Blending custom ASCII physics and elegant cinematic layout transitions.

import { AsciiEngine } from "./ascii-engine.js";

// Global showcase handlers to prevent double-click / spam glitches
window.openShowcase = function(el, event) {
    if (event) event.stopPropagation();
    if (el.classList.contains('active') || el.dataset.cooldown) return;
    
    el.dataset.cooldown = 'true';
    setTimeout(() => {
        delete el.dataset.cooldown;
    }, 450); // 450ms cooldown
    
    el.classList.add('active');
};

window.closeShowcase = function(el, event) {
    if (event) {
        event.stopPropagation();
        // Only allow closing if clicking directly on the background overlay (outside the image content)
        if (event.target !== el) return;
    }
    const parent = el.parentElement;
    if (parent.dataset.cooldown) return;
    
    parent.dataset.cooldown = 'true';
    setTimeout(() => {
        delete parent.dataset.cooldown;
    }, 450);
    
    parent.classList.remove('active');
};

document.addEventListener("DOMContentLoaded", () => {
    const introContainer = document.getElementById("intro-container");
    const portfolioContainer = document.getElementById("portfolio-container");
    const mouseFollower = document.getElementById("mouse-follower");
    const clockElement = document.getElementById("local-clock");

    let asciiEngine = null;
    let cursorX = -1000, cursorY = -1000;

    // Preload and monitor collage images to ensure smooth fade-in transitions without pops
    const collageImgs = document.querySelectorAll("#collage-container img");
    collageImgs.forEach(img => {
        if (img.complete) {
            img.classList.add("loaded");
        } else {
            img.addEventListener("load", () => img.classList.add("loaded"));
            img.addEventListener("error", () => img.classList.add("loaded")); // Fallback
        }
    });

    // --- 1. Initialize Custom Monospace ASCII Cursor Follower (Snake Trail) ---
    const trailLength = 8;
    const historyX = Array(trailLength).fill(-1000);
    const historyY = Array(trailLength).fill(-1000);
    let lastMouseMoveTime = Date.now();
    let prevCursorX = -1000, prevCursorY = -1000;
    let mouseSpeed = 0;
    
    // Inject the snake trail segments dynamically into the follower container
    if (mouseFollower) {
        mouseFollower.innerHTML = ""; // Clear legacy elements
        const asciiChars = ["█", "█", "▓", "▓", "▒", "░", "·", "."];
        asciiChars.forEach((char) => {
            const span = document.createElement("span");
            span.className = "trail-segment";
            span.textContent = char;
            mouseFollower.appendChild(span);
        });
    }

    window.addEventListener("mousemove", (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
        lastMouseMoveTime = Date.now();
    });

    function updateFollower() {
        if (mouseFollower) {
            // Calculate cursor speed (distance moved since last frame)
            let distance = 0;
            if (prevCursorX !== -1000 && prevCursorY !== -1000 && cursorX !== -1000 && cursorY !== -1000) {
                const dx = cursorX - prevCursorX;
                const dy = cursorY - prevCursorY;
                distance = Math.sqrt(dx * dx + dy * dy);
            }
            // Smooth the speed metric with LERP damping
            mouseSpeed += (distance - mouseSpeed) * 0.15;
            
            // Save coordinates for the next frame calculation
            prevCursorX = cursorX;
            prevCursorY = cursorY;

            // Determine if cursor is hovering over the Hero section (#home)
            let isOverHero = false;
            const homeSection = document.getElementById("home");
            if (homeSection) {
                const rect = homeSection.getBoundingClientRect();
                isOverHero = (
                    cursorX >= rect.left &&
                    cursorX <= rect.right &&
                    cursorY >= rect.top &&
                    cursorY <= rect.bottom
                );
            }
            
            // Determine if mouse is idle (inactivity longer than 400ms)
            const isIdle = (Date.now() - lastMouseMoveTime) > 400;
            mouseFollower.style.opacity = (isOverHero && !isIdle) ? "1" : "0";
            
            // Push current position to the head of the trail
            historyX[0] = cursorX;
            historyY[0] = cursorY;
            
            // Map speed to LERP factor (faster movement -> smaller factor -> longer trail lag)
            const speedRatio = Math.min(1.0, mouseSpeed / 70);
            const currentLerp = 0.22 - (speedRatio * 0.16); // ranges from 0.22 (slow) to 0.06 (fast)
            
            // Cascade trailing values down the history array with dynamic interpolation
            for (let i = 1; i < trailLength; i++) {
                historyX[i] += (historyX[i-1] - historyX[i]) * currentLerp;
                historyY[i] += (historyY[i-1] - historyY[i]) * currentLerp;
            }
            
            // Render segment positions with pixel-by-pixel retro grid snapping centered on the coordinate
            const stepX = 8;
            const stepY = 12;
            const segments = mouseFollower.querySelectorAll(".trail-segment");
            segments.forEach((seg, i) => {
                // Since the segment has width: 20px and height: 20px (centered flexbox),
                // we subtract 7px (slightly less than 10px) to offset the snake slightly lower right.
                const snappedX = Math.round((historyX[i] - 7) / stepX) * stepX;
                const snappedY = Math.round((historyY[i] - 7) / stepY) * stepY;
                seg.style.transform = `translate3d(${snappedX}px, ${snappedY}px, 0)`;
            });
        }
        requestAnimationFrame(updateFollower);
    }
    requestAnimationFrame(updateFollower);

    // --- Navbar Spotlight Border Effect ---
    const navbar = document.querySelector(".hero-navbar");
    if (navbar) {
        navbar.addEventListener("mousemove", (e) => {
            const rect = navbar.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            navbar.style.setProperty("--nav-x", `${x}px`);
            navbar.style.setProperty("--nav-y", `${y}px`);
        });
    }

    // Attach hover-grow behaviors to interactive elements
    function attachCursorHoverHandlers() {
        const clickables = document.querySelectorAll("a, button, .center-stack-wrapper");
        clickables.forEach(el => {
            el.addEventListener("mouseenter", () => mouseFollower.classList.add("hovering-interactive"));
            el.addEventListener("mouseleave", () => mouseFollower.classList.remove("hovering-interactive"));
        });
    }

    // --- 2. Live Local Clock (Awwwards staple) ---
    function updateClock() {
        if (!clockElement) return;
        const now = new Date();
        const options = {
            timeZone: 'Asia/Manila',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        const timeString = new Intl.DateTimeFormat('en-US', options).format(now);
        clockElement.textContent = `${timeString} PHT (GMT+8)`;
    }
    setInterval(updateClock, 1000);
    updateClock();


    // --- 3. Instantiate ASCII Intro Canvas ---
    function onIntroComplete() {
        introContainer.classList.add("dismissed");
        portfolioContainer.classList.remove("hide");

        // Reveal header logo symbol immediately
        const headerLogo = document.querySelector(".site-header .logo-symbol");
        if (headerLogo) {
            headerLogo.style.visibility = "visible";
        }

        attachCursorHoverHandlers();

        // --- Hero Entrance Animation (scroll locked) ---
        const heroSection = document.getElementById("home");
        if (heroSection) {
            heroSection.classList.add("hero-entrance");

            // Stage 1: ANGELO LOZANO rises up (after 800ms to let ASCII star shine)
            setTimeout(() => {
                heroSection.classList.add("title-reveal");
            }, 800);

            // Stage 2: UI UX rises up (800ms after title)
            setTimeout(() => {
                heroSection.classList.add("uiux-reveal");
            }, 1600);

            // Stage 3: Remove entrance classes + unlock scrolling (after 3s total)
            setTimeout(() => {
                heroSection.classList.remove("hero-entrance", "title-reveal", "uiux-reveal");
                initLenis();
            }, 3000);
        } else {
            initLenis();
        }

        // Initialize works section sticky scroll tracking
        initWorksStickyScroll();

        // Initialize poster showcase timeline tracking
        initPosterTimeline();

        // Initialize scroll-dismiss for work section image overlays
        initWorkOverlayScrollDismiss();

        // Remove intro container from DOM after fade transitions complete
        setTimeout(() => {
            introContainer.remove();
        }, 1000);
    }

    function initLenis() {
        document.documentElement.classList.add("lenis-smooth");
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: "vertical",
            gestureDirection: "vertical",
            smooth: true,
            smoothTouch: false
        });
        window.lenis = lenis;

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Bind in-page nav links to scroll smoothly using Lenis
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#home') {
                    return;
                }
                if (targetId === '#about') {
                    const showcase = document.querySelector(".poster-timeline-section");
                    if (showcase) {
                        e.preventDefault();
                        const trigger = ScrollTrigger.getAll().find(st => st.vars.trigger === ".poster-timeline-section");
                        if (trigger) {
                            lenis.scrollTo(trigger.end);
                        } else {
                            lenis.scrollTo(showcase.offsetTop + 3000);
                        }
                    }
                    return;
                }
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    lenis.scrollTo(targetEl);
                }
            });
        });
    }

    // Dismiss active work section image overlays on scroll
    function initWorkOverlayScrollDismiss() {
        window.addEventListener("scroll", () => {
            const activeOverlays = document.querySelectorAll(".showcase-placeholder.active");
            activeOverlays.forEach(el => el.classList.remove("active"));
        });
    }

    // Set up loading triggers (fullscreen click transitions are handled in ascii-engine.js)
    asciiEngine = new AsciiEngine("ascii-pre", onIntroComplete);

    // Refresh cursor hover states on resize
    window.addEventListener("resize", () => {
        if (portfolioContainer.classList.contains("hide")) return;
        attachCursorHoverHandlers();
    });

    // --- 4. Interactive Hero ASCII Wave Generator ---
    function initHeroAscii() {
        const canvas = document.getElementById("hero-ascii-canvas");
        const anchor = document.querySelector(".center-stack-wrapper");
        const homeSection = document.getElementById("home");
        if (!canvas || !anchor) return;

        const cols = 50;
        const rows = 26;

        let currentX = cols / 2;
        let currentY = rows / 2;
        let portalScale = 1.0;
        let scrollProgress = 0;
        let targetScrollProgress = 0;
        let isHovered = false;

        // Track window scroll to update transition progress smoothly
        window.addEventListener("scroll", () => {
            const scrollTop = window.scrollY;
            const maxScroll = 500; // Complete transition over 500px scroll
            targetScrollProgress = Math.min(1.0, Math.max(0.0, scrollTop / maxScroll));

            // Toggle unpinned class on hero section after animation is finished
            if (scrollTop >= 500) {
                homeSection.classList.add("unpinned");
            } else {
                homeSection.classList.remove("unpinned");
            }
        });

        // Elite UX touch: clicking the HOME nav link resets the hero section states
        const homeLink = document.querySelector('a[href="#home"]');
        if (homeLink) {
            homeLink.addEventListener("click", (e) => {
                if (homeSection && (homeSection.classList.contains("portal-active") || homeSection.classList.contains("portal-complete"))) {
                    e.preventDefault();
                    homeSection.classList.remove("portal-active", "portal-complete");
                    portalScale = 1.0;
                    if (window.lenis) {
                        window.lenis.scrollTo(0);
                    } else {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                } else {
                    e.preventDefault();
                    if (window.lenis) {
                        window.lenis.scrollTo(0);
                    } else {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                }
            });
        }

        const chars = ["0", "1", "=", "/", "%", ".", " "];
        let t = 0;

        function render() {
            if (!document.getElementById("hero-ascii-canvas")) return; // Guard if element is removed

            t += 0.025; // Controls rotation velocity

            // Smoothly LERP scrollProgress for inertia scrolling animation
            scrollProgress += (targetScrollProgress - scrollProgress) * 0.1;
            anchor.style.setProperty("--scroll-progress", scrollProgress);

            // Interpolate mouse coordinates smoothly back to center (hover is disabled)
            const targetX = cols / 2;
            const targetY = rows / 2;

            // Smooth damping
            currentX += (targetX - currentX) * 0.15;
            currentY += (targetY - currentY) * 0.15;

            // Smoothly LERP portalScale to 3.5 when portal-active is triggered
            const targetPortalScale = homeSection && homeSection.classList.contains("portal-active") ? 3.5 : 1.0;
            portalScale += (targetPortalScale - portalScale) * 0.05;

            // Initialize empty spacing buffer
            const buffer = Array(rows).fill(null).map(() => Array(cols).fill(" "));

            // 3D rotation angles
            const rotX = t * 0.45;
            const rotY = t * 0.7;

            const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
            const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

            const gridLines = 14;
            const samples = 50;

            // Plot grid lines in U direction
            for (let g = 0; g <= gridLines; g++) {
                const u = (g / gridLines) * 2 * Math.PI;
                for (let s = 0; s <= samples; s++) {
                    const v = -Math.PI / 2 + Math.PI * (s / samples);
                    plotStarPoint(u, v);
                }
            }

            // Plot grid lines in V direction
            for (let g = 0; g <= gridLines; g++) {
                const v = -Math.PI / 2 + Math.PI * (g / gridLines);
                for (let s = 0; s <= samples; s++) {
                    const u = (s / samples) * 2 * Math.PI;
                    plotStarPoint(u, v);
                }
            }

            function plotStarPoint(u, v) {
                const cosU = Math.cos(u), sinU = Math.sin(u);
                const cosV = Math.cos(v), sinV = Math.sin(v);

                // 3D Astroid shape math with scaled axes: Y > X > Z
                const px = Math.sign(cosU) * Math.pow(Math.abs(cosU), 3.0) * Math.pow(cosV, 3.0) * 0.85;
                const py = Math.sign(sinU) * Math.pow(Math.abs(sinU), 3.0) * Math.pow(cosV, 3.0) * 1.25;
                const pz = Math.sign(sinV) * Math.pow(Math.abs(sinV), 3.0) * 0.50;

                // Target 3D "X" coordinates for morph
                let tx, ty, tz;
                if (u < Math.PI) {
                    tx = sinV * 1.1;
                    ty = sinV * 1.1;
                    tz = cosV * 0.15;
                } else {
                    tx = sinV * 1.1;
                    ty = -sinV * 1.1;
                    tz = cosV * 0.15;
                }

                // Blend star shape and X shape based on scrollProgress
                const xBlend = px * (1 - scrollProgress) + tx * scrollProgress;
                const yBlend = py * (1 - scrollProgress) + ty * scrollProgress;
                const zBlend = pz * (1 - scrollProgress) + tz * scrollProgress;

                // 3D rotation using blended coordinates
                let x1 = xBlend * cosY - zBlend * sinY;
                let z1 = xBlend * sinY + zBlend * cosY;

                let y2 = yBlend * cosX - z1 * sinX;
                let z2 = yBlend * sinX + z1 * cosX;

                // Scaling and perspective projection
                const scaleX = cols * 0.38 * portalScale;
                const scaleY = rows * 0.38 * portalScale;

                // Shift based on mouse coordinate hover
                const starOffsetX = (currentX - cols / 2) / (cols / 2);
                const starOffsetY = (currentY - rows / 2) / (rows / 2);
                const sx = Math.floor(cols / 2 + x1 * scaleX + starOffsetX * (cols * 0.15));
                const sy = Math.floor(rows / 2 + y2 * scaleY + starOffsetY * (rows * 0.15));

                if (sx >= 0 && sx < cols && sy >= 0 && sy < rows) {
                    const depthVal = (z2 + 1.0) / 2.0; // Normalize Z depth between 0 and 1
                    const depthIndex = Math.floor(depthVal * (chars.length - 1));

                    // Transition character set to 'x' on scroll progress
                    let char;
                    if (scrollProgress > 0.7) {
                        char = "x";
                    } else {
                        char = chars[Math.min(chars.length - 1, Math.max(0, depthIndex))];
                    }
                    buffer[sy][sx] = char;
                }
            }

            // Convert character buffer to HTML string, wrapping illuminated proximity cells in spans
            const msx = Math.floor(currentX);
            const msy = Math.floor(currentY);

            let htmlFrame = "";
            for (let y = 0; y < rows; y++) {
                let line = "";
                for (let x = 0; x < cols; x++) {
                    const char = buffer[y][x];
                    if (char !== " ") {
                        const dx = x - msx;
                        const dy = y - msy;
                        const screenDist = Math.sqrt(dx * dx + (dy * 1.8) * (dy * 1.8));

                        if (isHovered && screenDist < 4.8) {
                            line += `<span style="color: #ffffff; font-weight: 600;">x</span>`;
                        } else {
                            line += char;
                        }
                    } else {
                        line += " ";
                    }
                }
                htmlFrame += line + "\n";
            }

            canvas.innerHTML = htmlFrame;
            requestAnimationFrame(render);
        }

        render();
    }

    function initWorksStickyScroll() {
        const folders = document.querySelectorAll(".work-folder");
        if (!folders.length) return;

        function updateActiveFolder() {
            if (window.innerWidth <= 768) {
                folders.forEach(folder => {
                    folder.classList.add("active");
                });
                return;
            }

            let activeIndex = 0;
            const stickyThreshold = 135; // Slightly below sticky top offset (120px) to trigger reliably

            folders.forEach((folder, index) => {
                const rect = folder.getBoundingClientRect();
                if (rect.top <= stickyThreshold) {
                    activeIndex = index;
                }
            });

            folders.forEach((folder, i) => {
                if (i === activeIndex) {
                    folder.classList.add("active");
                } else {
                    folder.classList.remove("active");
                }
            });
        }

        window.addEventListener("scroll", updateActiveFolder);
        window.addEventListener("resize", updateActiveFolder);
        updateActiveFolder();
    }

    function initPosterTimeline() {
        const showcase = document.querySelector(".poster-timeline-section");
        if (!showcase) return;

        gsap.registerPlugin(ScrollTrigger);

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: ".poster-timeline-section",
                start: "top top",
                end: "+=3000",
                pin: true,
                scrub: 2.5,
                onUpdate: (self) => {
                    // Enable pointer events on posters when fanned out (progress between 35% and 55%)
                    if (self.progress >= 0.35 && self.progress <= 0.55) {
                        showcase.classList.add("active-focus");
                    } else {
                        showcase.classList.remove("active-focus");
                    }
                }
            }
        });

        // Precise visual layout coordinates for Stage 3 fanning
        const cardDestinations = [
            { selector: ".poster-card.card-1", x: "-22vw", y: "-18vh", z: -10, scale: 0.7 },
            { selector: ".poster-card.card-2", x: "-23vw", y: "5vh", z: 80, scale: 0.8 }, // Sneaker
            { selector: ".poster-card.card-3", x: "-2vw", y: "-26vh", z: 10, scale: 0.75 },
            { selector: ".poster-card.card-4", x: "-3vw", y: "0vh", z: 120, scale: 1.0 }, // Central Statue
            { selector: ".poster-card.card-5", x: "16vw", y: "-18vh", z: -10, scale: 0.7 },
            { selector: ".poster-card.card-6", x: "0vw", y: "25vh", z: 20, scale: 0.75 },
            { selector: ".poster-card.card-7", x: "20vw", y: "20vh", z: -15, scale: 0.7 },
            { selector: ".poster-card.card-8", x: "-26vw", y: "20vh", z: -20, scale: 0.65 },
            { selector: ".poster-card.card-9", x: "23vw", y: "2vh", z: 80, scale: 0.8 } // Mech
        ];

        // Initialize poster cards to opacity: 1 behind the cover card at the start of the timeline
        cardDestinations.forEach((dest) => {
            tl.set(dest.selector, { opacity: 1, z: 0, rotationY: 0, scale: dest.scale, x: 0, y: 0, rotationZ: 0 }, 0);
        });

        // Initialize about section components
        tl.set(".left-contact-box", { y: 80, opacity: 0 }, 0);
        tl.set(".about-lead-text", { y: 80, opacity: 0 }, 0);
        tl.set(".soft-skills-container .skills-group", { y: 60, opacity: 0 }, 0);

        // Initialize about-cover-card to be invisible and match the closed cover card size/position
        tl.set(".about-cover-card", {
            width: "320px",
            height: "440px",
            borderRadius: "20px",
            boxShadow: "0 20px 50px rgba(8, 8, 10, 0.15)",
            z: 21,
            x: 0,
            y: 0,
            rotationY: 0,
            opacity: 0
        }, 0);

        // STAGE 1: Shrink white cover card from full-viewport down to 320x440 portrait rectangle (0% to 15% duration)
        tl.fromTo(".poster-cover-card",
            {
                width: "100%",
                height: "100%",
                borderRadius: "0px",
                boxShadow: "0 0 0 rgba(0,0,0,0)",
                z: 50
            },
            {
                width: "320px",
                height: "440px",
                borderRadius: "20px",
                boxShadow: "0 20px 50px rgba(8, 8, 10, 0.15)",
                z: 50,
                duration: 0.15,
                ease: "power1.out"
            },
            0
        );

        // Fade in cover internal designs as the card shrinks
        tl.fromTo(".cover-design-inner",
            { opacity: 0 },
            { opacity: 1, duration: 0.10, ease: "power1.out" },
            0.05
        );

        // Animate title from top-left to center of the cover card
        tl.fromTo(".poster-section-title",
            {
                left: "40px",
                xPercent: 0,
                top: "80px",
                y: 0,
                scale: 1.0,
                color: "#08080a",
                z: 51
            },
            {
                left: "50%",
                xPercent: -50,
                top: "50%",
                yPercent: -50,
                scale: 0.35,
                color: "#08080a",
                z: 51,
                duration: 0.15,
                ease: "power1.inOut"
            },
            0
        );

        // STAGE 2: THE ANCHORED BLOCK FLIP (Scroll Progress: 15% → 35%)
        // Translate cover card slightly to the right (x: 120px) to act as a wing panel opening up close to the deck,
        // and then slide it back to the center but at the back of the stack (z: -50).
        tl.to(".poster-cover-card", {
            rotationY: 180,
            duration: 0.20,
            ease: "power1.inOut"
        }, 0.15);
        tl.to(".poster-cover-card", {
            x: "120px",
            z: 100,
            duration: 0.10,
            ease: "power1.out"
        }, 0.15);
        tl.to(".poster-cover-card", {
            x: 0,
            z: -50,
            duration: 0.10,
            ease: "power1.in"
        }, 0.25);

        // Translate and rotate title along the same path, and fade out
        tl.to(".poster-section-title", {
            rotationY: 180,
            duration: 0.20,
            ease: "power1.inOut"
        }, 0.15);
        tl.to(".poster-section-title", {
            x: "120px",
            z: 101,
            opacity: 0, // fades to 0 and stays hidden
            duration: 0.10,
            ease: "power1.out"
        }, 0.15);
        tl.to(".poster-section-title", {
            x: 0,
            z: -49,
            duration: 0.10,
            ease: "power1.in"
        }, 0.25);

        // All 9 cards perform a uniform rotationY: 180 flip and diverge to create gaps
        cardDestinations.forEach((dest) => {
            const partialX = dest.x.endsWith("vw") ? `${parseFloat(dest.x) * 0.35}vw` : `${parseFloat(dest.x) * 0.35}px`;
            const partialY = dest.y.endsWith("vh") ? `${parseFloat(dest.y) * 0.35}vh` : `${parseFloat(dest.y) * 0.35}px`;
            const partialZ = dest.z * 0.35;

            tl.to(dest.selector, {
                rotationY: 180,
                x: partialX,
                y: partialY,
                z: partialZ,
                duration: 0.20,
                ease: "power1.inOut"
            }, 0.15);
        });

        // STAGE 3: THE MIDWAY ARTWORK SCATTER HOLD (Scroll Progress: 35% → 55%)
        // Complete fanning to final coordinates
        cardDestinations.forEach((dest) => {
            tl.to(dest.selector, {
                x: dest.x,
                y: dest.y,
                z: dest.z,
                scale: dest.scale,
                rotationZ: 0,
                duration: 0.10,
                ease: "power2.out"
            }, 0.35);
        });

        // STAGE 4: THE CLOSING COLLAPSE AND ORIGINAL COVER CARD FLIP BACK (Scroll Progress: 55% → 70%)
        // Pull expanded posters back to center, rotating forward to 360, and fading out
        cardDestinations.forEach((dest) => {
            tl.to(dest.selector, {
                x: 0,
                y: 0,
                z: 0,
                rotationY: 360,
                scale: dest.scale,
                rotationZ: 0,
                duration: 0.15,
                ease: "power1.inOut"
            }, 0.55);
            
            tl.to(dest.selector, {
                opacity: 0,
                duration: 0.05
            }, 0.65);
        });

        // Flip original cover card back, returning from the left edge (x: -120px) and rising to the front to seal the deck
        tl.to(".poster-cover-card", {
            rotationY: 360,
            duration: 0.15,
            ease: "power1.inOut"
        }, 0.55);
        tl.to(".poster-cover-card", {
            x: "-120px",
            z: 100,
            duration: 0.075,
            ease: "power1.out"
        }, 0.55);
        tl.to(".poster-cover-card", {
            x: 0,
            z: 50,
            duration: 0.075,
            ease: "power1.in"
        }, 0.625);

        // Hide original cover card exactly at 70% so it swaps cleanly
        tl.to(".poster-cover-card", {
            opacity: 0,
            duration: 0.01
        }, 0.70);

        // STAGE 5: REVEAL DUPLICATE COVER CARD & EXPAND (Scroll Progress: 70% → 85%)
        // Make about-cover-card visible
        tl.to(".about-cover-card", {
            opacity: 1,
            duration: 0.01
        }, 0.70);

        // Expand duplicate cover card to full viewport
        tl.to(".about-cover-card", {
            width: "100%",
            height: "100%",
            borderRadius: "0px",
            boxShadow: "0 0 0 rgba(0,0,0,0)",
            z: 100,
            duration: 0.15,
            ease: "power2.inOut"
        }, 0.70);

        // STAGE 6: ABOUT ME CONTENT REVEAL (Scroll Progress: 85% → 100%)
        // Fade in the about-section overlay wrapper
        tl.to(".about-section", {
            opacity: 1,
            pointerEvents: "auto",
            duration: 0.04,
            ease: "power1.inOut"
        }, 0.85);

        // Staggered slide up of text content
        tl.to(".about-left h2", {
            y: 0,
            opacity: 1,
            duration: 0.12,
            ease: "power2.out"
        }, 0.87);

        tl.to(".left-contact-box", {
            y: 0,
            opacity: 1,
            duration: 0.12,
            ease: "power2.out"
        }, 0.89);

        tl.to(".about-lead-text", {
            y: 0,
            opacity: 1,
            duration: 0.12,
            ease: "power2.out"
        }, 0.91);

        tl.to(".soft-skills-container .skills-group", {
            y: 0,
            opacity: 1,
            duration: 0.12,
            ease: "power2.out",
            stagger: 0.04
        }, 0.93);
    }

    // --- 5. Per-Letter Left-Swipe Title Animation ---
    const letters = document.querySelectorAll(".kinetic-letter");
    letters.forEach(letter => {
        // Wrap each character in an inner span to enable independent clipping transforms
        const char = letter.textContent;
        letter.innerHTML = `<span class="letter-inner">${char}</span>`;
        const inner = letter.querySelector(".letter-inner");

        let letterTl = null;
        letter.addEventListener("mouseenter", () => {
            if (letterTl && letterTl.isActive()) return; // Ignore retriggers while this letter is animating

            // Reset state
            gsap.killTweensOf(inner);
            gsap.set(inner, { x: "0%" });

            letterTl = gsap.timeline();
            letterTl.to(inner, {
                x: "-105%",
                duration: 0.35,
                ease: "power2.in"
            })
            .set(inner, {
                x: "105%"
            })
            .to(inner, {
                x: "0%",
                duration: 0.45,
                ease: "power2.out"
            });
        });
    });

    initHeroAscii();
});
