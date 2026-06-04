// main.js - Core Orchestrator for Angelo Lozano's Creative Portfolio
// Blending custom ASCII physics, periodic table layouts, and fluid image reveals.

import { AsciiEngine } from "./ascii-engine.js";
import { periodicElements } from "./projects-data.js";

document.addEventListener("DOMContentLoaded", () => {
    const introContainer = document.getElementById("intro-container");
    const portfolioContainer = document.getElementById("portfolio-container");
    const periodicGrid = document.getElementById("periodic-grid");
    const mouseFollower = document.getElementById("mouse-follower");
    const coordDisplay = mouseFollower.querySelector(".follower-coord");
    const clockElement = document.getElementById("local-clock");
    const hoveredCoords = document.getElementById("hovered-coords");

    // Panel Elements
    const projectPanel = document.getElementById("project-panel");
    const btnClosePanel = document.getElementById("btn-close-panel");
    const panelLogo = document.getElementById("panel-logo");
    const panelProjNumber = document.getElementById("panel-project-number");
    const panelTitle = document.getElementById("panel-project-title");
    const panelSubtitle = document.getElementById("panel-project-subtitle");
    const panelMetaConcept = document.getElementById("panel-meta-concept");
    const panelMetaRole = document.getElementById("panel-meta-role");
    const panelMetaTech = document.getElementById("panel-meta-tech");
    const panelImageContainer = document.getElementById("panel-image-container");
    const panelImage = document.getElementById("panel-project-image");
    const panelDesc = document.getElementById("panel-project-description");
    const panelSynthesis = document.getElementById("panel-project-synthesis");
    const customContent = document.getElementById("custom-panel-content");
    const btnPanelNext = document.getElementById("btn-panel-next");

    let asciiEngine = null;
    let cursorX = 0, cursorY = 0;
    let followerX = 0, followerY = 0;

    // Active Project Navigation State
    let currentProjectIndex = 0;
    const projectElementsList = periodicElements.filter(el => el.isProject);

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
        const clickables = document.querySelectorAll("a, button, .grid-cell:not(.cell-empty)");
        clickables.forEach(el => {
            el.addEventListener("mouseenter", () => mouseFollower.classList.add("hovering-interactive"));
            el.addEventListener("mouseleave", () => mouseFollower.classList.remove("hovering-interactive"));
        });
    }

    // --- 2. Live Local Clock (Awwwards staple) ---
    function updateClock() {
        const now = new Date();
        // Format to Philippine Time or Philippines local time where user is (UTC+8)
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

        // Trigger coordinate mapping and render
        buildPeriodicGrid();
        attachCursorHoverHandlers();

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

    // --- 4. Build Dynamic Periodic Table ---
    function buildPeriodicGrid() {
        periodicGrid.innerHTML = "";

        // Map of row/cols containing elements
        const elementMap = {};
        periodicElements.forEach(el => {
            elementMap[`${el.row}-${el.col}`] = el;
        });

        // Determine grid columns based on screen size (Awwwards mobile compliance)
        const width = window.innerWidth;
        let maxCols = 18;
        let maxRows = 5;

        if (width < 768) {
            // Mobile Layout: standard simple vertical stacking or slimmed columns
            renderLinearGrid();
            return;
        } else if (width < 992) {
            // Tablet Layout: 9 columns
            maxCols = 9;
            maxRows = 10;
        }

        // Standard Grid Assembly
        for (let r = 1; r <= maxRows; r++) {
            for (let c = 1; c <= maxCols; c++) {
                // Map actual original periodic table cells to smaller grids if tablet
                let element = null;
                if (maxCols === 18) {
                    element = elementMap[`${r}-${c}`];
                } else {
                    // Flatten mapping for tablet (2 columns fit into 1 row block)
                    const index = (r - 1) * maxCols + (c - 1);
                    element = periodicElements[index] || null;
                }

                if (element) {
                    const cell = document.createElement("div");
                    cell.className = `grid-cell ${element.category}`;
                    if (element.isProject) cell.classList.add("case-study");

                    cell.style.gridColumn = c;
                    cell.style.gridRow = r;

                    cell.innerHTML = `
            <span class="cell-coord">${element.number}</span>
            <span class="cell-symbol">${element.symbol}</span>
            <span class="cell-name">${element.name}</span>
          `;

                    // Coordinate tracking on hover
                    cell.addEventListener("mouseenter", () => {
                        hoveredCoords.textContent = `COL: ${c.toString().padStart(2, '0')} / ROW: ${r.toString().padStart(2, '0')}`;
                    });
                    cell.addEventListener("mouseleave", () => {
                        hoveredCoords.textContent = "COORD: X0, Y0";
                    });

                    // Click trigger for case studies/info blocks
                    cell.addEventListener("click", () => {
                        if (element.isProject) {
                            openProjectPanel(element);
                        }
                    });

                    periodicGrid.appendChild(cell);
                } else {
                    // Render silent empty layout grid cells
                    const emptyCell = document.createElement("div");
                    emptyCell.className = "grid-cell cell-empty";
                    emptyCell.style.gridColumn = c;
                    emptyCell.style.gridRow = r;
                    periodicGrid.appendChild(emptyCell);
                }
            }
        }
    }

    // Linear layout fallback for mobile phones (strictly robust responsive design)
    function renderLinearGrid() {
        periodicElements.forEach(element => {
            const cell = document.createElement("div");
            cell.className = `grid-cell ${element.category}`;
            if (element.isProject) cell.classList.add("case-study");

            cell.innerHTML = `
        <span class="cell-coord">${element.number}</span>
        <span class="cell-symbol">${element.symbol}</span>
        <span class="cell-name">${element.name}</span>
      `;

            cell.addEventListener("click", () => {
                if (element.isProject) {
                    openProjectPanel(element);
                }
            });

            periodicGrid.appendChild(cell);
        });
    }

    // Refresh grid layout on resize to preserve columns ratio
    window.addEventListener("resize", () => {
        if (portfolioContainer.classList.contains("hide")) return;
        buildPeriodicGrid();
        attachCursorHoverHandlers();
    });

    // --- 5. Editorial Panel Reveal Animation (creativecue.co / simonholm.studio style) ---
    function openProjectPanel(project) {
        // Record current global navigation index
        currentProjectIndex = projectElementsList.findIndex(p => p.projectId === project.projectId);

        // Clear dynamic states
        panelImageContainer.classList.remove("revealed");
        customContent.innerHTML = "";
        customContent.style.display = "none";

        // Setup generic fields
        panelLogo.textContent = `${project.category.toUpperCase()}-${project.number} / ${project.symbol}`;
        panelProjNumber.textContent = project.number;
        panelTitle.textContent = project.name;
        panelSubtitle.textContent = project.subtitle;

        panelMetaConcept.textContent = project.subtitle.split("Case Study")[0].trim();
        panelMetaRole.textContent = project.category === "profile" ? "Identity" : "UI/UX & Tech Lead";
        panelMetaTech.textContent = project.tech ? project.tech.join(", ") : "Vanilla CSS, HTML5, Canvas";

        panelDesc.textContent = project.details;

        if (project.image) {
            panelImage.style.display = "block";
            panelImage.src = project.image;
            panelImage.alt = project.name;
        } else {
            panelImage.style.display = "none";
        }

        // Custom triggers based on project ID
        if (project.projectId === "ascii") {
            // 1. ASCII Computational Art Case: Spawn interactive ASCII grid canvas!
            setupInteractivePanelCanvas();
        } else if (project.projectId === "contact") {
            // 2. Contact form block
            setupContactForm();
        } else if (project.projectId === "about") {
            // 3. About page synthesis details
            panelMetaRole.textContent = "Computer Science Student";
            panelMetaTech.textContent = "Algorithms, UI/UX Design, Poster Graphics";
        }

        // Toggle panel slide transition
        projectPanel.classList.add("active");

        // Lock scrolling on main page while panel is active
        document.body.style.overflow = "hidden";

        // Fluid clip-path image reveal wipe trigger
        setTimeout(() => {
            panelImageContainer.classList.add("revealed");
        }, 250);
    }

    function closeProjectPanel() {
        projectPanel.classList.remove("active");
        panelImageContainer.classList.remove("revealed");

        // Restore scrolling based on viewport size
        if (window.innerWidth >= 768) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    }

    btnClosePanel.addEventListener("click", closeProjectPanel);

    // --- 6. Specialized Case Study Components ---

    // Generates interactive canvas inside the panel for ASCII engine module
    function setupInteractivePanelCanvas() {
        customContent.style.display = "block";
        customContent.innerHTML = `
      <div class="panel-canvas-container">
        <canvas id="panel-ascii-canvas" class="panel-interactive-canvas"></canvas>
        <span class="canvas-instruction">MOVE MOUSE OVER CANVAS TO EMIT ASCII PARTICLES</span>
      </div>
    `;

        const pCanvas = document.getElementById("panel-ascii-canvas");
        if (!pCanvas) return;

        const pCtx = pCanvas.getContext("2d");
        const container = pCanvas.parentElement;
        pCanvas.width = container.clientWidth;
        pCanvas.height = container.clientHeight;

        const particles = [];
        const glyphs = ["#", "+", "=", "-", ":", "."];
        let pmouseX = null, pmouseY = null;

        pCanvas.addEventListener("mousemove", (e) => {
            const rect = pCanvas.getBoundingClientRect();
            pmouseX = e.clientX - rect.left;
            pmouseY = e.clientY - rect.top;

            // Emit particle on hover movement
            if (particles.length < 150) {
                particles.push({
                    x: pmouseX,
                    y: pmouseY,
                    vx: (Math.random() * 4 - 2),
                    vy: (Math.random() * -3 - 1), // Drift up
                    char: glyphs[Math.floor(Math.random() * glyphs.length)],
                    opacity: 1,
                    color: Math.random() < 0.15 ? "#ffaa00" : "#f5f5f7"
                });
            }
        });

        pCanvas.addEventListener("mouseleave", () => {
            pmouseX = null;
            pmouseY = null;
        });

        let frameId;
        function drawPanelCanvas() {
            if (!document.getElementById("panel-ascii-canvas")) return;
            frameId = requestAnimationFrame(drawPanelCanvas);

            pCtx.fillStyle = "#08080a";
            pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);

            pCtx.font = "10px 'Space Grotesk', monospace";

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05; // Faint gravity drift
                p.opacity -= 0.015;

                if (p.opacity <= 0) {
                    particles.splice(i, 1);
                } else {
                    pCtx.fillStyle = p.color;
                    pCtx.globalAlpha = p.opacity;
                    pCtx.fillText(p.char, p.x, p.y);
                }
            }
            pCtx.globalAlpha = 1.0;
        }

        drawPanelCanvas();

        // Clear panel canvas requests when panel details change
        btnClosePanel.addEventListener("click", () => cancelAnimationFrame(frameId), { once: true });
    }

    // Generates sleek typographic contact form inside panel
    function setupContactForm() {
        customContent.style.display = "block";
        customContent.innerHTML = `
      <form id="portfolio-contact-form" class="contact-form">
        <div class="form-group">
          <label class="form-label" for="form-name">VISITOR IDENTIFICATION (NAME)</label>
          <input class="form-input" type="text" id="form-name" required placeholder="eg. Julia Krantz">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-email">COMMUNICATIONS CHANNEL (EMAIL)</label>
          <input class="form-input" type="email" id="form-email" required placeholder="eg. julia@krantz.com">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-msg">TRANSMISSION PACKAGE (MESSAGE)</label>
          <textarea class="form-textarea" rows="4" id="form-msg" required placeholder="Describe your design objective or technological collaboration..."></textarea>
        </div>
        <button type="submit" class="btn-creative btn-submit">
          <span class="btn-text">INJECT TRANSMISSION</span>
          <span class="btn-arrow">→</span>
        </button>
      </form>
    `;

        const form = document.getElementById("portfolio-contact-form");
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector(".btn-submit");
            const originalText = submitBtn.querySelector(".btn-text").textContent;

            // Play Awwwards-style glitching feedback
            submitBtn.querySelector(".btn-text").textContent = "TRANSMITTING...";
            submitBtn.disabled = true;

            setTimeout(() => {
                form.innerHTML = `
          <div class="glow-alert" style="border: 1px solid var(--accent-color); padding: 30px; background: rgba(255,170,0,0.02); text-align: center;">
            <span style="font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--accent-color); display: block; margin-bottom: 10px;">TRANSMISSION RECEIVED</span>
            <p style="font-size: 12px; color: var(--text-secondary);">Your package has been successfully injected into Angelo Lozano's coordinate logs. Expect communication feedback shortly.</p>
          </div>
        `;
                attachCursorHoverHandlers();
            }, 1500);
        });

        // Make sure new buttons trigger cursor follower
        setTimeout(attachCursorHoverHandlers, 50);
    }

    // --- 7. Direct Carousel Slide Transitions inside Panel ---
    btnPanelNext.addEventListener("click", () => {
        // Increment index circularly
        let nextIndex = (currentProjectIndex + 1) % projectElementsList.length;
        const nextProject = projectElementsList[nextIndex];

        // Smooth scroll panel back to top
        projectPanel.scrollTo({ top: 0, behavior: 'smooth' });

        // Trigger transition: fade image reveal mask, load next project, re-reveal!
        panelImageContainer.classList.remove("revealed");

        setTimeout(() => {
            openProjectPanel(nextProject);
        }, 350);
    });
});
