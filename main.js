// main.js - Core Orchestrator for Angelo Lozano's Creative Portfolio
// Blending custom ASCII physics and elegant cinematic layout transitions.

import { AsciiEngine } from "./ascii-engine.js";

document.addEventListener("DOMContentLoaded", () => {
    const introContainer = document.getElementById("intro-container");
    const portfolioContainer = document.getElementById("portfolio-container");
    const mouseFollower = document.getElementById("mouse-follower");
    const clockElement = document.getElementById("local-clock");

    let asciiEngine = null;
    let cursorX = 0, cursorY = 0;

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

    // --- 1. Initialize Monochromatic Dot Cursor ---
    window.addEventListener("mousemove", (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;

        // Position dot cursor directly (no LERP lag, hardware accelerated)
        mouseFollower.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;

        // Update coordinates for CSS background glow
        document.body.style.setProperty("--mouse-x", `${cursorX}px`);
        document.body.style.setProperty("--mouse-y", `${cursorY}px`);
    });

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

        // Reveal header logo symbol to take over the landed intro logo
        const headerLogo = document.querySelector(".site-header .logo-symbol");
        if (headerLogo) {
            headerLogo.style.visibility = "visible";
        }

        attachCursorHoverHandlers();

        // Initialize Lenis smooth scroll
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
        document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#home') {
                    return; // Handled by specialized home link click listener
                }
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    lenis.scrollTo(targetEl);
                }
            });
        });

        // Initialize works section sticky scroll tracking
        initWorksStickyScroll();

        // Initialize poster showcase timeline tracking
        initPosterTimeline();

        // Remove intro container from DOM after fade transitions complete
        setTimeout(() => {
            const animContainer = document.getElementById("logo-animation-container");
            if (animContainer) {
                animContainer.style.display = "none";
            }
            introContainer.remove();
        }, 1000);
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
            const stickyThreshold = 185; // Slightly below sticky top offset (170px) to trigger reliably

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
                end: "bottom bottom",
                pin: true,
                scrub: 1,
                onUpdate: (self) => {
                    // Enable pointer events on posters when fanned out (progress between 45% and 80%)
                    if (self.progress >= 0.45 && self.progress <= 0.80) {
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

        // STAGE 1: Shrink white cover card from full-viewport down to 320x440 portrait rectangle (0% to 20% duration)
        // Set cover card at z: 50 (in front of poster cards at z: 0)
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
                duration: 0.20,
                ease: "power1.out"
            },
            0
        );

        // Fade in cover internal designs as the card shrinks
        tl.fromTo(".cover-design-inner",
            { opacity: 0 },
            { opacity: 1, duration: 0.15, ease: "power1.out" },
            0.05
        );

        // Drag title from top-left to sit centered on top of cover card (above its top edge with padding)
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
                y: -260,
                scale: 0.45,
                color: "#ffffff",
                z: 51,
                duration: 0.20,
                ease: "power1.inOut"
            },
            0
        );

        // STAGE 2: THE ANCHORED BLOCK FLIP (Scroll Progress: 20% → 45%)
        // Translate cover card slightly to the right (x: 120px) to act as a wing panel opening up close to the deck,
        // and then slide it back to the center but at the back of the stack (z: -50).
        tl.to(".poster-cover-card", {
            rotationY: 180,
            duration: 0.25,
            ease: "power1.inOut"
        }, 0.20);
        tl.to(".poster-cover-card", {
            x: "120px",
            z: 100,
            duration: 0.125,
            ease: "power1.out"
        }, 0.20);
        tl.to(".poster-cover-card", {
            x: 0,
            z: -50,
            duration: 0.125,
            ease: "power1.in"
        }, 0.325);

        // Translate and rotate title along the same path, and fade out (make it hidden for the rest of the scrolling)
        tl.to(".poster-section-title", {
            rotationY: 180,
            duration: 0.25,
            ease: "power1.inOut"
        }, 0.20);
        tl.to(".poster-section-title", {
            x: "120px",
            z: 101,
            opacity: 0, // fades to 0 and stays hidden
            duration: 0.125,
            ease: "power1.out"
        }, 0.20);
        tl.to(".poster-section-title", {
            x: 0,
            z: -49,
            duration: 0.125,
            ease: "power1.in"
        }, 0.325);

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
                duration: 0.25,
                ease: "power1.inOut"
            }, 0.20);
        });

        // STAGE 3: THE MIDWAY ARTWORK SCATTER HOLD (Scroll Progress: 45% → 80%)
        // Complete fanning to final coordinates, leaving 35% of the scroll timeline to observe the posters
        cardDestinations.forEach((dest) => {
            tl.to(dest.selector, {
                x: dest.x,
                y: dest.y,
                z: dest.z,
                scale: dest.scale,
                rotationZ: 0,
                duration: 0.10,
                ease: "power2.out"
            }, 0.45);
        });

        // STAGE 4: THE CLOSING 360-DEGREE COLLAPSE (Scroll Progress: 80% → 100%)
        // Pull expanded posters back to center, rotating forward to 360, keeping opacity at 1
        cardDestinations.forEach((dest) => {
            tl.to(dest.selector, {
                x: 0,
                y: 0,
                z: 0, // Lands at z: 0 (behind cover card at z: 50)
                rotationY: 360,
                opacity: 1,
                scale: dest.scale,
                rotationZ: 0,
                duration: 0.20,
                ease: "power1.inOut"
            }, 0.80);
        });

        // Flip cover card back, returning from the left edge (x: -120px) and rising to the front to seal the deck
        tl.to(".poster-cover-card", {
            rotationY: 360,
            duration: 0.20,
            ease: "power1.inOut"
        }, 0.80);
        tl.to(".poster-cover-card", {
            x: "-120px",
            z: 100,
            duration: 0.10,
            ease: "power1.out"
        }, 0.80);
        tl.to(".poster-cover-card", {
            x: 0,
            z: 50,
            duration: 0.10,
            ease: "power1.in"
        }, 0.90);
    }

    initHeroAscii();
});
