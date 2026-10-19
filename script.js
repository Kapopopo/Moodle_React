(() => {
      "use strict";
      const $ = (selector, root = document) => root.querySelector(selector);
      const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

      const moodLabels = { 1: "Très difficile", 2: "Difficile", 3: "Neutre", 4: "Bien", 5: "Excellent" };
      const moodIcons = { 1: "angry", 2: "frown", 3: "meh", 4: "smile", 5: "laugh" };
      const moodColors = { 1: "#cf624f", 2: "#d9822b", 3: "#c88e1d", 4: "#529471", 5: "#2c9d70" };

      const kudosBadges = {
        help: { label: "Merci pour ton aide", icon: "hand-heart" },
        presentation: { label: "Super présentation", icon: "presentation" },
        idea: { label: "Excellente idée", icon: "lightbulb" },
        support: { label: "Soutien précieux", icon: "heart-handshake" },
        team: { label: "Super esprit d'équipe", icon: "rocket" }
      };

      const viewNames = {
        checkin: "Check-in quotidien",
        kudos: "Kudos",
        manager: "Météo de l'équipe",
        rh: "Cartographie RH"
      };

      const keyMood = "moodly_demo_moods_v3";
      const keyKudos = "moodly_demo_kudos_v3";
      const keyProfile = "moodly_demo_profile_v3";

      const base30DayScores = [
        3.8, 3.9, 3.7, 3.6, 3.8, 4.0, 4.1, 3.9, 3.7, 3.6,
        3.5, 3.7, 3.8, 3.6, 3.5, 3.6, 3.8, 3.9, 3.7, 3.6,
        3.5, 3.4, 3.3, 4.1, 3.8, 3.2, 4.0, 2.4, 2.1, 3.6
      ];

      let selectedScore = null;
      let isEditingToday = false;
      let currentManagerRange = 30;
      let chartPointsCache = [];
      let toastTimer;
      let breathInterval;
      let breathSeconds = 0;
      let breathPhase = 0;
      const phases = [
        { label: "Inspirez", duration: 4 },
        { label: "Retenez", duration: 4 },
        { label: "Expirez", duration: 6 }
      ];

      function renderIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
          window.lucide.createIcons();
        }
      }

      function dayKeyOffset(daysAgo = 0) {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 10);
      }

      function dayKey(date = new Date()) {
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 10);
      }

      function buildSeedMoods() {
        return [
          { date: dayKeyOffset(6), score: 4, tags: [], note: "" },
          { date: dayKeyOffset(5), score: 4, tags: [], note: "" },
          { date: dayKeyOffset(4), score: 3, tags: ["Outils / processus"], note: "" },
          { date: dayKeyOffset(3), score: 4, tags: [], note: "" },
          { date: dayKeyOffset(2), score: 2, tags: ["Charge de travail"], note: "Beaucoup de livrables en parallèle." },
          { date: dayKeyOffset(1), score: 2, tags: ["Charge de travail", "Équilibre pro/perso"], note: "Journée dense." }
        ];
      }

      function buildSeedKudos() {
        return [
          { sender: "Camille (Marketing)", receiver: "Sam (Produit)", badge: "Excellente idée", icon: "lightbulb", when: "Il y a 12 min" },
          { sender: "Inès (Tech)", receiver: "Camille (Marketing)", badge: "Soutien précieux", icon: "heart-handshake", when: "Il y a 1 h" },
          { sender: "Thomas (Design)", receiver: "Équipe Produit", badge: "Super esprit d'équipe", icon: "rocket", when: "Hier" }
        ];
      }

      function readStore(key, fallbackBuilder) {
        try {
          const value = localStorage.getItem(key);
          if (value) return JSON.parse(value);
          const initial = typeof fallbackBuilder === "function" ? fallbackBuilder() : fallbackBuilder;
          if (initial !== null && initial !== undefined) {
            localStorage.setItem(key, JSON.stringify(initial));
          }
          return initial;
        } catch (error) {
          return typeof fallbackBuilder === "function" ? fallbackBuilder() : fallbackBuilder;
        }
      }

      function writeStore(key, value) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (error) {
          showToast("Enregistrement local indisponible dans ce navigateur.");
          return false;
        }
      }

      function showToast(message) {
        const toast = $("#toast");
        toast.textContent = message;
        toast.classList.remove("hidden");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.add("hidden"), 3600);
      }

      function sanitizeNoteRGPD(rawText) {
        if (!rawText) return { clean: "", redacted: false };
        let clean = rawText;
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const phoneRegex = /(?:\+33|0)[1-9](?:[\s.-]*\d{2}){4}/g;
        const redacted = emailRegex.test(clean) || phoneRegex.test(clean);
        clean = clean.replace(emailRegex, "[email masqué RGPD]").replace(phoneRegex, "[téléphone masqué RGPD]");
        return { clean, redacted };
      }

      function setProfile(email) {
        const namePart = email.split("@")[0];
        const role = /^(rh|.*[._-]rh)$/i.test(namePart)
          ? "hr"
          : /^(manager|.*[._-]manager)$/i.test(namePart)
          ? "manager"
          : "employee";
        const displayName =
          role === "hr"
            ? "Morgan RH"
            : role === "manager"
            ? "Alex Manager"
            : namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._-]/g, " ");
        const profile = { email, role, displayName };
        writeStore(keyProfile, profile);
        applyProfile(profile);
      }

      function applyProfile(profile) {
        const roleNames = { employee: "Collaborateur", manager: "Manager", hr: "RH / Direction" };
        $("#profileName").textContent = profile.displayName || "Alex Martin";
        $("#profileRole").textContent = roleNames[profile.role] || roleNames.employee;
        $("#avatarInitials").textContent = (profile.displayName || "AL")
          .split(/\s+/)
          .map(part => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        $("#roleSelect").value = profile.role;

        $("#navPilotageLabel").classList.toggle("hidden", profile.role === "employee");
        $$('.nav button').forEach(button => {
          const target = button.dataset.view;
          const isHidden =
            (target === "manager" && profile.role === "employee") ||
            (target === "rh" && profile.role !== "hr");
          button.classList.toggle("hidden", isHidden);
        });

        if (profile.role === "employee" && ["manager", "rh"].includes(getCurrentView())) {
          switchView("checkin");
        } else if (profile.role === "manager" && getCurrentView() === "rh") {
          switchView("manager");
        }
      }

      function getCurrentView() {
        const active = $(".view:not(.hidden)");
        return active ? active.id.replace("view-", "") : "checkin";
      }

      function switchView(name) {
        const profile = readStore(keyProfile, () => ({ role: "employee" }));
        if ((name === "manager" && profile.role === "employee") || (name === "rh" && profile.role !== "hr")) {
          showToast("Cet espace est réservé aux profils Manager ou RH.");
          return;
        }
        $$(".view").forEach(view => view.classList.toggle("hidden", view.id !== `view-${name}`));
        $$(".nav button").forEach(button => {
          const active = button.dataset.view === name;
          button.classList.toggle("active", active);
          if (active) button.setAttribute("aria-current", "page");
          else button.removeAttribute("aria-current");
        });
        $("#crumbCurrent").textContent = viewNames[name];
        if (name === "manager") {
          updateManagerMetrics();
          drawChart();
        }
      }

      function moodEntries() {
        return readStore(keyMood, buildSeedMoods);
      }

      function updateHistory() {
        const entries = moodEntries();
        const holder = $("#historyDots");
        holder.innerHTML = "";
        const today = new Date();

        for (let offset = 6; offset >= 0; offset--) {
          const date = new Date(today);
          date.setDate(today.getDate() - offset);
          const k = dayKey(date);
          const entry = entries.find(item => item.date === k);

          const dot = document.createElement("div");
          dot.className = "history-dot" + (offset === 0 ? " today" : "");

          const iconWrap = document.createElement("span");
          if (entry) {
            const icon = document.createElement("i");
            icon.dataset.lucide = moodIcons[entry.score];
            icon.className = "icon";
            icon.style.color = moodColors[entry.score];
            iconWrap.appendChild(icon);
            dot.title = `${moodLabels[entry.score]} (${entry.score}/5)${entry.tags?.length ? " · " + entry.tags.join(", ") : ""}`;
          } else {
            iconWrap.textContent = "—";
            iconWrap.style.color = "#b5b1be";
            dot.title = "Aucun check-in enregistré";
          }
          iconWrap.setAttribute("aria-label", entry ? moodLabels[entry.score] : "Aucun check-in");

          const label = document.createElement("small");
          label.textContent = offset === 0 ? "Auj." : date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
          dot.append(iconWrap, label);
          holder.append(dot);
        }

        const sorted = entries.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
        const newestDate = sorted.length ? new Date(`${sorted[0].date}T12:00:00`) : null;
        const consecutiveHard = sorted.length === 3 && sorted.every((entry, idx) => {
          const expected = new Date(newestDate);
          expected.setDate(expected.getDate() - idx);
          return entry.score <= 2 && entry.date === dayKey(expected);
        });
        $("#streakAlert").classList.toggle("hidden", !consecutiveHard);

        const todayEntry = entries.find(entry => entry.date === dayKey());
        const savedBanner = $("#savedCheckinBanner");
        const optionsGroup = $("#moodOptionsGroup");

        if (todayEntry && !isEditingToday) {
          $$(".mood-option").forEach(btn => {
            btn.setAttribute("aria-pressed", String(Number(btn.dataset.score) === todayEntry.score));
          });
          optionsGroup.classList.add("locked");
          $("#lowMoodForm").classList.add("hidden");
          savedBanner.classList.remove("hidden");
          $("#savedCheckinTitle").textContent = `Check-in du jour enregistré : ${moodLabels[todayEntry.score]} (${todayEntry.score}/5)`;
          const tagInfo = todayEntry.tags && todayEntry.tags.length ? ` · Tags : ${todayEntry.tags.join(", ")}` : "";
          $("#savedCheckinSummary").textContent = `Vous pouvez modifier votre ressenti à tout moment de la journée${tagInfo}.`;
          $("#checkinStateHint").textContent = "Check-in complété pour aujourd'hui";
        } else {
          optionsGroup.classList.remove("locked");
          savedBanner.classList.add("hidden");
          if (!isEditingToday) {
            $$(".mood-option").forEach(btn => btn.setAttribute("aria-pressed", "false"));
            $("#checkinStateHint").textContent = "Cliquez sur une humeur pour enregistrer votre journée";
          }
        }

        renderIcons();
      }

      function enableEditToday() {
        const todayEntry = moodEntries().find(entry => entry.date === dayKey());
        isEditingToday = true;
        $("#moodOptionsGroup").classList.remove("locked");
        $("#savedCheckinBanner").classList.add("hidden");
        $("#checkinStateHint").textContent = "Modification en cours · choisissez votre nouvelle humeur";

        if (todayEntry) {
          selectedScore = todayEntry.score;
          $$(".mood-option").forEach(btn => {
            btn.setAttribute("aria-pressed", String(Number(btn.dataset.score) === todayEntry.score));
          });
          if (todayEntry.score <= 2) {
            $("#lowMoodForm").classList.remove("hidden");
            $$(".reason-tag").forEach(tagBtn => {
              const active = todayEntry.tags && todayEntry.tags.includes(tagBtn.textContent);
              tagBtn.setAttribute("aria-pressed", String(Boolean(active)));
            });
            $("#anonymousNote").value = todayEntry.note || "";
          }
        }
        showToast("Vous pouvez maintenant modifier votre check-in du jour.");
      }

      function selectMood(score) {
        selectedScore = score;
        $$(".mood-option").forEach(button => {
          button.setAttribute("aria-pressed", String(Number(button.dataset.score) === score));
        });
        $("#lowMoodForm").classList.toggle("hidden", score > 2);

        if (score > 2) {
          saveMood(score, [], "");
        } else {
          $("#lowMoodForm").scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }

      function saveMood(score, tags, rawNote) {
        const { clean, redacted } = sanitizeNoteRGPD(rawNote);
        const entries = moodEntries().filter(entry => entry.date !== dayKey());
        entries.push({ date: dayKey(), score, tags, note: clean });
        if (!writeStore(keyMood, entries.slice(-30))) return;

        selectedScore = null;
        isEditingToday = false;
        $("#lowMoodForm").classList.add("hidden");
        $("#anonymousNote").value = "";
        $$(".reason-tag").forEach(button => button.setAttribute("aria-pressed", "false"));

        updateHistory();
        updateManagerMetrics();

        if (redacted) {
          showToast("Info personnelle masquée automatiquement (RGPD) et check-in enregistré.");
        } else if (score <= 2) {
          showToast("Check-in enregistré. Prenons un instant pour respirer.");
          openBreath();
        } else {
          showToast("Votre check-in du jour a bien été enregistré !");
        }
      }

      function getManagerSeries(rangeDays) {
        const entries = moodEntries();
        const todayEntry = entries.find(e => e.date === dayKey());
        const series30 = base30DayScores.slice();

        if (todayEntry) {
          const teamBlend = Number(((3.6 * 4 + todayEntry.score) / 5).toFixed(1));
          series30[series30.length - 1] = teamBlend;
        }

        const sliced = series30.slice(-rangeDays);
        return sliced.map((val, idx) => {
          const daysAgo = sliced.length - 1 - idx;
          const d = new Date();
          d.setDate(d.getDate() - daysAgo);
          const label =
            daysAgo === 0
              ? "Aujourd'hui"
              : daysAgo === 1
              ? "Hier"
              : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
          return { value: val, label, daysAgo };
        });
      }

      function updateManagerMetrics() {
        const series = getManagerSeries(currentManagerRange);
        const avg = series.reduce((sum, item) => sum + item.value, 0) / series.length;
        $("#chartPeriodAvg").textContent = `${avg.toFixed(1).replace(".", ",")} / 5`;

        const titles = {
          3: "Humeur moyenne de l'équipe · 3 derniers jours",
          7: "Humeur moyenne de l'équipe · Dernière semaine (7 j)",
          30: "Humeur moyenne de l'équipe · Mois (30 derniers jours)"
        };
        $("#chartPeriodTitle").textContent = titles[currentManagerRange] || titles[30];

        const todayEntry = moodEntries().find(e => e.date === dayKey());
        const mktScore = todayEntry ? ((3.8 * 11 + todayEntry.score) / 12) : 3.8;
        $("#marketingScore").textContent = mktScore.toFixed(1).replace(".", ",");
        $("#marketingBar").style.width = `${Math.round((mktScore / 5) * 100)}%`;
      }

      function drawChart() {
        const canvas = $("#moodChart");
        if (!canvas || canvas.offsetWidth === 0) return;
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        const pad = { top: 20, right: 22, bottom: 30, left: 34 };
        const plotW = width - pad.left - pad.right;
        const plotH = height - pad.top - pad.bottom;
        const dataPoints = getManagerSeries(currentManagerRange);

        ctx.clearRect(0, 0, width, height);
        ctx.font = "10px Inter, system-ui, sans-serif";

        [1, 2, 3, 4, 5].forEach(value => {
          const y = pad.top + plotH * (5 - value) / 4;
          ctx.strokeStyle = "#eeeae4";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(width - pad.right, y);
          ctx.stroke();

          ctx.fillStyle = "#96929f";
          ctx.textAlign = "right";
          ctx.fillText(String(value), pad.left - 10, y + 3);
        });

        chartPointsCache = dataPoints.map((pt, index) => {
          const x = pad.left + (plotW * index) / Math.max(1, dataPoints.length - 1);
          const y = pad.top + (plotH * (5 - pt.value)) / 4;
          return { x, y, ...pt };
        });

        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
        grad.addColorStop(0, "rgba(118, 88, 222, 0.20)");
        grad.addColorStop(1, "rgba(118, 88, 222, 0.0)");
        ctx.beginPath();
        chartPointsCache.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.lineTo(chartPointsCache[chartPointsCache.length - 1].x, pad.top + plotH);
        ctx.lineTo(chartPointsCache[0].x, pad.top + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        chartPointsCache.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = "#7658de";
        ctx.lineWidth = 2.6;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();

        chartPointsCache.forEach((pt, idx) => {
          const isLast = idx === chartPointsCache.length - 1;
          const showDot = currentManagerRange <= 7 || isLast || idx === 0 || idx % 5 === 0;
          if (!showDot) return;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isLast ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = isLast ? "#5f43c8" : "#ffffff";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#7658de";
          ctx.stroke();
        });

        ctx.fillStyle = "#7d7a89";
        if (currentManagerRange <= 7) {
          chartPointsCache.forEach((pt, idx) => {
            ctx.textAlign = idx === 0 ? "left" : idx === chartPointsCache.length - 1 ? "right" : "center";
            ctx.fillText(pt.label, pt.x, height - 7);
          });
        } else {
          ctx.textAlign = "left";
          ctx.fillText("J-30", pad.left, height - 7);
          ctx.textAlign = "center";
          ctx.fillText("J-15", pad.left + plotW / 2, height - 7);
          ctx.textAlign = "right";
          ctx.fillText("Aujourd'hui", width - pad.right, height - 7);
        }
      }

      function handleChartHover(event) {
        const canvas = $("#moodChart");
        const tooltip = $("#chartTooltip");
        if (!chartPointsCache.length) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;

        let closest = chartPointsCache[0];
        let minDist = Math.abs(mouseX - closest.x);
        for (const pt of chartPointsCache) {
          const d = Math.abs(mouseX - pt.x);
          if (d < minDist) {
            minDist = d;
            closest = pt;
          }
        }

        if (minDist <= 28) {
          tooltip.classList.remove("hidden");
          tooltip.style.left = `${closest.x}px`;
          tooltip.style.top = `${closest.y}px`;
          tooltip.innerHTML = `<strong>${closest.label}</strong> · Score : ${closest.value.toFixed(1).replace(".", ",")} / 5`;
        } else {
          tooltip.classList.add("hidden");
        }
      }

      function renderFeed() {
        const feed = readStore(keyKudos, buildSeedKudos).slice(0, 10);
        const holder = $("#kudosFeed");
        holder.innerHTML = "";
        feed.forEach(item => {
          const row = document.createElement("div");
          row.className = "feed-item";
          const badge = document.createElement("span");
          badge.className = "feed-badge";
          badge.setAttribute("aria-hidden", "true");
          const storedLabel = Object.values(kudosBadges).find(option => item.badge.includes(option.label));
          const iconName = item.icon || (storedLabel && storedLabel.icon) || "heart";
          const badgeIcon = document.createElement("i");
          badgeIcon.dataset.lucide = iconName;
          badgeIcon.className = "icon";
          badge.append(badgeIcon);

          const copy = document.createElement("div");
          copy.className = "feed-copy";
          const message = document.createElement("div");
          const strongSender = document.createElement("strong");
          strongSender.textContent = item.sender;
          const strongReceiver = document.createElement("strong");
          strongReceiver.textContent = item.receiver;
          message.append(strongSender, " a envoyé un Kudos à ", strongReceiver, " · ", storedLabel ? storedLabel.label : item.badge);
          const when = document.createElement("small");
          when.textContent = item.when;
          copy.append(message, when);
          row.append(badge, copy);
          holder.append(row);
        });
        renderIcons();
      }

      function openBreath() {
        $("#breathModal").classList.remove("hidden");
        $("#closeBreath").focus();
      }

      function closeBreath() {
        clearInterval(breathInterval);
        breathInterval = null;
        $("#breathOrb").classList.remove("running");
        $("#breathOrb").textContent = "Prêt";
        $("#breathTimer").textContent = "Inspirez 4 s · Retenez 4 s · Expirez 6 s";
        $("#startBreath").textContent = "Commencer";
        $("#breathModal").classList.add("hidden");
      }

      function startBreath() {
        clearInterval(breathInterval);
        breathSeconds = 0;
        breathPhase = 0;
        $("#breathOrb").classList.add("running");
        $("#breathOrb").textContent = "Inspirez · 4 s";
        $("#breathTimer").textContent = "Cycle 1 · suivez votre respiration, sans forcer";
        $("#startBreath").textContent = "Recommencer";
        breathInterval = setInterval(() => {
          breathSeconds++;
          const cycleSeconds = breathSeconds % 14;
          if (cycleSeconds === 0) breathPhase = 0;
          else if (cycleSeconds === 4) breathPhase = 1;
          else if (cycleSeconds === 8) breathPhase = 2;
          const phase = phases[breathPhase];
          const remaining = phase.duration - (cycleSeconds - (breathPhase === 0 ? 0 : breathPhase === 1 ? 4 : 8));
          $("#breathOrb").textContent = `${phase.label} · ${Math.max(1, remaining)} s`;
          $("#breathTimer").textContent = `Cycle ${Math.floor(breathSeconds / 14) + 1} · suivez votre respiration, sans forcer`;
        }, 1000);
      }

      function exportRhCsv() {
        const csvContent = [
          "Departement;Repondants;Score_Moyen_Sur_5;Statut_RGPD",
          "Marketing;12;4.1;Affiche",
          "Produit;11;3.6;Affiche",
          "Tech;15;2.9;Affiche",
          "RH_Support;10;4.3;Affiche",
          "Juridique;4;MASQUE_QUORUM_INFERIEUR_10;Verrouille"
        ].join("");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `rapport_rse_moodly_${dayKey()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Rapport RSE anonymisé téléchargé (CSV).");
      }

      $("#loginButton").addEventListener("click", () => {
        const email = $("#loginEmail").value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          $("#loginEmail").setAttribute("aria-invalid", "true");
          showToast("Saisissez une adresse email professionnelle valide.");
          $("#loginEmail").focus();
          return;
        }
        $("#loginEmail").removeAttribute("aria-invalid");
        setProfile(email);
        $("#loginOverlay").classList.add("hidden");
        showToast(`Connecté via SSO (${email})`);
      });

      $$("[data-demo-email]").forEach(btn => {
        btn.addEventListener("click", () => {
          $("#loginEmail").value = btn.dataset.demoEmail;
          $("#loginButton").click();
        });
      });

      $("#loginEmail").addEventListener("keydown", event => {
        if (event.key === "Enter") $("#loginButton").click();
      });

      $("#logoutButton").addEventListener("click", () => {
        $("#loginOverlay").classList.remove("hidden");
        $("#loginEmail").focus();
      });

      $("#roleSelect").addEventListener("change", event => {
        const selected = event.target.value;
        const email =
          selected === "hr"
            ? "rh@entreprise.com"
            : selected === "manager"
            ? "manager@entreprise.com"
            : "alex@entreprise.com";
        setProfile(email);
        if (selected === "manager") switchView("manager");
        else if (selected === "hr") switchView("rh");
        else switchView("checkin");
        showToast(`Vue active : ${selected === "hr" ? "RH / Direction" : selected === "manager" ? "Manager" : "Employé"}`);
      });

      $$(".nav button[data-view]").forEach(button => {
        button.addEventListener("click", () => switchView(button.dataset.view));
      });

      $$(".mood-option").forEach(button => {
        button.addEventListener("click", () => selectMood(Number(button.dataset.score)));
      });

      $("#editCheckinBtn").addEventListener("click", enableEditToday);

      $("#resetDemoBtn").addEventListener("click", () => {
        localStorage.removeItem(keyMood);
        isEditingToday = false;
        selectedScore = null;
        updateHistory();
        updateManagerMetrics();
        showToast("Données de démonstration réinitialisées (6 derniers jours restaurés).");
      });

      $("#helpLineBtn").addEventListener("click", () => {
        showToast("Ligne d'écoute psychologique 24/7 : 0 800 00 00 00 (Appel anonyme et gratuit).");
      });

      $$(".reason-tag").forEach(button => {
        button.addEventListener("click", () => {
          button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true"));
        });
      });

      $$(".badge-option").forEach(button => {
        button.addEventListener("click", () => {
          $$(".badge-option").forEach(option => option.setAttribute("aria-pressed", String(option === button)));
        });
      });

      $("#submitMood").addEventListener("click", () => {
        if (!selectedScore || selectedScore > 2) return;
        const tags = $$(".reason-tag[aria-pressed='true']").map(button => button.textContent);
        saveMood(selectedScore, tags, $("#anonymousNote").value.trim());
      });

      $("#sendKudos").addEventListener("click", () => {
        const receiver = $("#receiver").value;
        if (!receiver) {
          showToast("Choisissez un collègue avant d'envoyer votre Kudos.");
          $("#receiver").focus();
          return;
        }
        const profile = readStore(keyProfile, () => ({ displayName: "Alex" }));
        const list = readStore(keyKudos, buildSeedKudos);
        const badgeId = $(".badge-option[aria-pressed='true']")?.dataset.badge;
        if (!badgeId || !kudosBadges[badgeId]) return;

        list.unshift({
          sender: profile.displayName,
          receiver,
          badge: kudosBadges[badgeId].label,
          icon: kudosBadges[badgeId].icon,
          when: "À l'instant"
        });
        if (!writeStore(keyKudos, list.slice(0, 10))) return;
        renderFeed();
        $("#receiver").value = "";
        showToast(`Votre Kudos a été envoyé à ${receiver} !`);
      });

      // Sélecteur de période Manager : 3 jours / 7 jours / 30 jours
      $$(".range-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          currentManagerRange = Number(btn.dataset.range);
          $$(".range-btn").forEach(b => {
            const active = b === btn;
            b.classList.toggle("active", active);
            b.setAttribute("aria-pressed", String(active));
          });
          updateManagerMetrics();
          drawChart();
        });
      });

      $("#moodChart").addEventListener("mousemove", handleChartHover);
      $("#moodChart").addEventListener("mouseleave", () => $("#chartTooltip").classList.add("hidden"));

      $$("[data-open-breath]").forEach(button => button.addEventListener("click", openBreath));
      $("#closeBreath").addEventListener("click", closeBreath);
      $("#finishBreath").addEventListener("click", closeBreath);
      $("#startBreath").addEventListener("click", startBreath);
      $("#breathModal").addEventListener("click", event => {
        if (event.target === $("#breathModal")) closeBreath();
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !$("#breathModal").classList.contains("hidden")) closeBreath();
      });

      $("#rhExport").addEventListener("click", exportRhCsv);
      window.addEventListener("resize", drawChart);

      // INITIALISATION
      $("#todayDate").textContent = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(new Date());

      renderFeed();
      updateHistory();
      updateManagerMetrics();
      renderIcons();

      const savedProfile = readStore(keyProfile, () => null);
      if (savedProfile && savedProfile.email) {
        applyProfile(savedProfile);
        $("#loginOverlay").classList.add("hidden");
      }
    })();