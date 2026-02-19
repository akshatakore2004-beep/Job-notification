(function () {
  var STORAGE_KEY = "jobNotificationTracker_saved";
  var PREFS_KEY = "jobTrackerPreferences";
  var STATUS_KEY = "jobTrackerStatus";
  var TESTS_KEY = "jobTrackerTests";
  var ARTIFACTS_KEY = "jobTrackerArtifacts";
  var jobs = window.JOBS_DATA || [];
  var toastTimer = null;

  function getSavedIds() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function setSavedIds(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  function isSaved(id) {
    return getSavedIds().indexOf(id) >= 0;
  }

  function saveJob(id) {
    var ids = getSavedIds();
    if (ids.indexOf(id) < 0) {
      ids.push(id);
      setSavedIds(ids);
      return true;
    }
    return false;
  }

  function unsaveJob(id) {
    var ids = getSavedIds().filter(function (x) { return x !== id; });
    setSavedIds(ids);
  }

  function formatPosted(days) {
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return days + " days ago";
  }

  function getJobById(id) {
    for (var i = 0; i < jobs.length; i++) {
      if (jobs[i].id === id) return jobs[i];
    }
    return null;
  }

  function loadStatusMap() {
    try {
      var raw = localStorage.getItem(STATUS_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveStatusMap(map) {
    try {
      localStorage.setItem(STATUS_KEY, JSON.stringify(map || {}));
    } catch (_) {
      // ignore
    }
  }

  function loadTests() {
    try {
      var raw = localStorage.getItem(TESTS_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveTests(map) {
    try {
      localStorage.setItem(TESTS_KEY, JSON.stringify(map || {}));
    } catch (_) {
      // ignore
    }
  }

  function loadArtifacts() {
    try {
      var raw = localStorage.getItem(ARTIFACTS_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveArtifacts(artifacts) {
    try {
      localStorage.setItem(ARTIFACTS_KEY, JSON.stringify(artifacts || {}));
    } catch (_) {
      // ignore
    }
  }

  function getJobStatus(id) {
    var map = loadStatusMap();
    var entry = map[id];
    return entry && entry.status ? entry.status : "Not Applied";
  }

  function setJobStatus(id, status) {
    var map = loadStatusMap();
    map[id] = {
      status: status,
      changedAt: new Date().toISOString()
    };
    saveStatusMap(map);
  }

  function isValidUrl(url) {
    if (!url) return false;
    if (typeof url !== "string") return false;
    var trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;
    if (trimmed.indexOf(" ") >= 0) return false;
    var idx = trimmed.indexOf("://");
    return idx > -1 && trimmed.indexOf(".", idx) > idx + 3;
  }

  function getDefaultPreferences() {
    return {
      roleKeywords: [],
      preferredLocations: [],
      preferredModes: [],
      experienceLevel: "",
      skills: [],
      minMatchScore: 40
    };
  }

  function loadPreferences() {
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      var prefs = getDefaultPreferences();
      if (Array.isArray(parsed.roleKeywords)) prefs.roleKeywords = parsed.roleKeywords;
      if (Array.isArray(parsed.preferredLocations)) prefs.preferredLocations = parsed.preferredLocations;
      if (Array.isArray(parsed.preferredModes)) prefs.preferredModes = parsed.preferredModes;
      if (typeof parsed.experienceLevel === "string") prefs.experienceLevel = parsed.experienceLevel;
      if (Array.isArray(parsed.skills)) prefs.skills = parsed.skills;
      if (typeof parsed.minMatchScore === "number") prefs.minMatchScore = parsed.minMatchScore;
      return prefs;
    } catch (_) {
      return null;
    }
  }

  function savePreferences(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (_) {
      // ignore
    }
  }

  function hasPreferencesConfigured() {
    var prefs = loadPreferences();
    if (!prefs) return false;
    return (
      (prefs.roleKeywords && prefs.roleKeywords.length) ||
      (prefs.preferredLocations && prefs.preferredLocations.length) ||
      (prefs.preferredModes && prefs.preferredModes.length) ||
      (prefs.experienceLevel && prefs.experienceLevel !== "") ||
      (prefs.skills && prefs.skills.length)
    );
  }

  function parseCommaList(value) {
    return (value || "")
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  }

  function toLowerArray(arr) {
    return (arr || []).map(function (s) {
      return String(s || "").toLowerCase();
    });
  }

  function computeMatchScore(job, prefs) {
    prefs = prefs || getDefaultPreferences();
    var score = 0;
    var title = (job.title || "").toLowerCase();
    var desc = (job.description || "").toLowerCase();
    var location = (job.location || "").toLowerCase();
    var mode = job.mode || "";
    var experience = job.experience || "";
    var source = job.source || "";
    var postedDays = job.postedDaysAgo != null ? job.postedDaysAgo : 99;

    var kw = toLowerArray(prefs.roleKeywords);
    if (kw.length) {
      var titleMatch = kw.some(function (k) { return k && title.indexOf(k) >= 0; });
      if (titleMatch) score += 25;
      var descMatch = kw.some(function (k) { return k && desc.indexOf(k) >= 0; });
      if (descMatch) score += 15;
    }

    if (prefs.preferredLocations && prefs.preferredLocations.length) {
      var locMatch = prefs.preferredLocations.some(function (l) {
        return location === String(l || "").toLowerCase();
      });
      if (locMatch) score += 15;
    }

    if (prefs.preferredModes && prefs.preferredModes.length) {
      var modeMatch = prefs.preferredModes.indexOf(mode) >= 0;
      if (modeMatch) score += 10;
    }

    if (prefs.experienceLevel) {
      if (experience === prefs.experienceLevel) {
        score += 10;
      }
    }

    if (prefs.skills && prefs.skills.length) {
      var jobSkillsLower = toLowerArray(job.skills || []);
      var prefSkillsLower = toLowerArray(prefs.skills);
      var skillsOverlap = prefSkillsLower.some(function (s) {
        return jobSkillsLower.indexOf(s) >= 0;
      });
      if (skillsOverlap) score += 15;
    }

    if (postedDays <= 2) {
      score += 5;
    }

    if (source === "LinkedIn") {
      score += 5;
    }

    if (score > 100) score = 100;
    if (score < 0) score = 0;
    return score;
  }

  function salaryToNumber(job) {
    var s = job.salaryRange || "";
    if (!s) return 0;
    var lpaMatch = s.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*LPA/i);
    if (lpaMatch) {
      var low = parseFloat(lpaMatch[1]);
      var high = parseFloat(lpaMatch[2]);
      if (isNaN(low) || isNaN(high)) return 0;
      return (low + high) / 2;
    }
    var monthMatch = s.match(/₹\s*(\d+)\s*k\s*[–-]\s*₹?\s*(\d+)\s*k.*month/i);
    if (monthMatch) {
      var mLow = parseFloat(monthMatch[1]);
      var mHigh = parseFloat(monthMatch[2]);
      if (isNaN(mLow) || isNaN(mHigh)) return 0;
      var avgMonthlyThousand = (mLow + mHigh) / 2;
      return (avgMonthlyThousand * 12) / 100;
    }
    return 0;
  }

  function getFilteredJobs(opts) {
    var prefs = opts.preferences || loadPreferences() || getDefaultPreferences();
    var onlyMatches = !!opts.onlyMatches;
    var list = jobs.slice();
    var kw = (opts.keyword || "").toLowerCase().trim();
    if (kw) {
      list = list.filter(function (j) {
        return (
          (j.title || "").toLowerCase().indexOf(kw) >= 0 ||
          (j.company || "").toLowerCase().indexOf(kw) >= 0
        );
      });
    }
    if (opts.location) {
      list = list.filter(function (j) {
        return (j.location || "") === opts.location;
      });
    }
    if (opts.mode) {
      list = list.filter(function (j) {
        return (j.mode || "") === opts.mode;
      });
    }
    if (opts.experience) {
      list = list.filter(function (j) {
        return (j.experience || "") === opts.experience;
      });
    }
    if (opts.source) {
      list = list.filter(function (j) {
        return (j.source || "") === opts.source;
      });
    }
    if (opts.status) {
      list = list.filter(function (j) {
        return getJobStatus(j.id) === opts.status;
      });
    }

    list = list.map(function (j) {
      j._matchScore = computeMatchScore(j, prefs);
      return j;
    });

    if (onlyMatches && prefs) {
      var threshold = typeof prefs.minMatchScore === "number" ? prefs.minMatchScore : 0;
      list = list.filter(function (j) {
        return (j._matchScore || 0) >= threshold;
      });
    }

    var sort = opts.sort || "latest";
    list.sort(function (a, b) {
      if (sort === "match") {
        return (b._matchScore || 0) - (a._matchScore || 0);
      }
      if (sort === "salary") {
        return salaryToNumber(b) - salaryToNumber(a);
      }
      var da = a.postedDaysAgo != null ? a.postedDaysAgo : 0;
      var db = b.postedDaysAgo != null ? b.postedDaysAgo : 0;
      return da - db;
    });
    return list;
  }

  function getUniqueLocations() {
    var seen = {};
    jobs.forEach(function (j) {
      var loc = j.location || "";
      if (loc && !seen[loc]) seen[loc] = true;
    });
    return Object.keys(seen).sort();
  }

  function renderJobCard(job, container, options) {
    options = options || {};
    var saved = isSaved(job.id);
    var matchScore = typeof options.matchScore === "number" ? options.matchScore : (typeof job._matchScore === "number" ? job._matchScore : null);
    var matchHtml = "";
    if (matchScore != null) {
      var cls = "kn-job-card__match--verylow";
      if (matchScore >= 80) cls = "kn-job-card__match--high";
      else if (matchScore >= 60) cls = "kn-job-card__match--medium";
      else if (matchScore >= 40) cls = "kn-job-card__match--low";
      matchHtml =
        "<span class=\"kn-job-card__match " + cls + "\">" +
        "Match " + matchScore + "%</span>";
    }
    var status = getJobStatus(job.id);
    var statusButtonsHtml =
      "<div class=\"kn-job-status-group\">" +
        ["Not Applied", "Applied", "Rejected", "Selected"].map(function (st) {
          var lower = st.toLowerCase().replace(" ", "-");
          var active = st === status ? " kn-job-status-btn--active" : "";
          return "<button type=\"button\" class=\"kn-job-status-btn kn-job-status-btn--" + lower + active + "\" data-status=\"" + escapeHtml(st) + "\">" + escapeHtml(st) + "</button>";
        }).join("") +
      "</div>";

    var card = document.createElement("div");
    card.className = "kn-job-card";
    card.setAttribute("data-job-id", job.id);
    card.innerHTML =
      "<h3 class=\"kn-job-card__title\">" + escapeHtml(job.title) + "</h3>" +
      "<p class=\"kn-job-card__company\">" + escapeHtml(job.company) + "</p>" +
      "<div class=\"kn-job-card__meta\">" +
        "<span>" + escapeHtml(job.location || "") + " · " + escapeHtml(job.mode || "") + "</span>" +
      "</div>" +
      "<p class=\"kn-job-card__meta\">Experience: " + escapeHtml(job.experience || "") + "</p>" +
      "<p class=\"kn-job-card__salary\">" + escapeHtml(job.salaryRange || "") + "</p>" +
      "<div class=\"kn-job-card__footer\">" +
        "<span class=\"kn-job-card__badge\">" + escapeHtml(job.source || "") + "</span>" +
        "<span class=\"kn-job-card__posted\">" + formatPosted(job.postedDaysAgo != null ? job.postedDaysAgo : 0) + "</span>" +
        (matchHtml || "") +
      "</div>" +
      statusButtonsHtml +
      "<div class=\"kn-job-card__actions\">" +
        "<button type=\"button\" class=\"kn-btn kn-btn--secondary\" data-action=\"view\">View</button>" +
        "<button type=\"button\" class=\"kn-btn kn-btn--secondary\" data-action=\"save\">" + (saved ? "Saved" : "Save") + "</button>" +
        "<button type=\"button\" class=\"kn-btn kn-btn--primary\" data-action=\"apply\">Apply</button>" +
      "</div>";
    container.appendChild(card);

    card.querySelector("[data-action=view]").addEventListener("click", function () {
      openModal(job);
    });
    card.querySelector("[data-action=save]").addEventListener("click", function () {
      toggleSave(job, card);
    });
    card.querySelector("[data-action=apply]").addEventListener("click", function () {
      if (job.applyUrl) window.open(job.applyUrl, "_blank");
    });

    card.querySelectorAll(".kn-job-status-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var newStatus = btn.getAttribute("data-status") || "Not Applied";
        updateJobStatus(job, card, newStatus);
      });
    });

    if (options.onCardClick) {
      card.addEventListener("click", function (e) {
        if (!e.target.closest("[data-action]")) options.onCardClick(job);
      });
    }
  }

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function toggleSave(job, card) {
    var btn = card ? card.querySelector("[data-action=save]") : null;
    if (isSaved(job.id)) {
      unsaveJob(job.id);
      if (btn) btn.textContent = "Save";
    } else {
      saveJob(job.id);
      if (btn) btn.textContent = "Saved";
    }
    renderDashboard();
    renderSavedPage();
  }

  function showToast(message) {
    var el = document.getElementById("kn-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "kn-toast";
      el.className = "kn-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.display = "block";
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(function () {
      el.style.display = "none";
    }, 2000);
  }

  function updateJobStatus(job, card, status) {
    setJobStatus(job.id, status);
    if (card) {
      var group = card.querySelector(".kn-job-status-group");
      if (group) {
        group.querySelectorAll(".kn-job-status-btn").forEach(function (btn) {
          btn.classList.remove("kn-job-status-btn--active");
        });
        group.querySelectorAll(".kn-job-status-btn").forEach(function (btn) {
          if ((btn.getAttribute("data-status") || "") === status) {
            btn.classList.add("kn-job-status-btn--active");
          }
        });
      }
    }
    if (status === "Applied" || status === "Rejected" || status === "Selected") {
      showToast("Status updated: " + status);
    }
    refreshDigestView();
    renderDashboard();
    renderSavedPage();
  }

  function getAllTestIds() {
    return [
      "prefsPersist",
      "matchScore",
      "onlyMatchesToggle",
      "savePersist",
      "applyNewTab",
      "statusPersist",
      "statusFilter",
      "digestTop10",
      "digestPersist",
      "noConsoleErrors"
    ];
  }

  function areArtifactsCompleteAndValid() {
    var art = loadArtifacts();
    return (
      isValidUrl(art.lovableProject) &&
      isValidUrl(art.githubRepo) &&
      isValidUrl(art.liveDeployment)
    );
  }

  function getTestsPassedCount(map) {
    var ids = getAllTestIds();
    var count = 0;
    ids.forEach(function (id) {
      if (map[id]) count += 1;
    });
    return count;
  }

  function allTestsPassed() {
    var map = loadTests();
    return getTestsPassedCount(map) === getAllTestIds().length;
  }

  function canShipProject1() {
    return allTestsPassed() && areArtifactsCompleteAndValid();
  }

  function applyTestsToUI() {
    var map = loadTests();
    var checkboxes = document.querySelectorAll(".jt-test-checkbox");
    Array.prototype.forEach.call(checkboxes, function (cb) {
      var id = cb.getAttribute("data-test-id");
      cb.checked = !!map[id];
    });
    var passed = getTestsPassedCount(map);
    var total = getAllTestIds().length;
    var countEl = document.getElementById("jt-test-passed");
    var warningEl = document.getElementById("jt-test-warning");
    if (countEl) countEl.textContent = String(passed);
    if (warningEl) {
      warningEl.style.display = passed < total ? "block" : "none";
    }
    updateProjectStatusUI();
  }

  function initTestsChecklist() {
    var list = document.getElementById("jt-test-list");
    if (!list) return;
    applyTestsToUI();

    list.addEventListener("change", function (e) {
      if (!e.target || !e.target.classList.contains("jt-test-checkbox")) return;
      var id = e.target.getAttribute("data-test-id");
      if (!id) return;
      var map = loadTests();
      map[id] = !!e.target.checked;
      saveTests(map);
      applyTestsToUI();
    });

    var resetBtn = document.getElementById("jt-test-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        saveTests({});
        applyTestsToUI();
      });
    }
  }

  function applyArtifactsToForm() {
    var art = loadArtifacts();
    var lovableInput = document.getElementById("jt-link-lovable");
    var githubInput = document.getElementById("jt-link-github");
    var liveInput = document.getElementById("jt-link-live");
    if (lovableInput) lovableInput.value = art.lovableProject || "";
    if (githubInput) githubInput.value = art.githubRepo || "";
    if (liveInput) liveInput.value = art.liveDeployment || "";
  }

  function updateArtifactsFromInputs() {
    var lovableInput = document.getElementById("jt-link-lovable");
    var githubInput = document.getElementById("jt-link-github");
    var liveInput = document.getElementById("jt-link-live");
    var art = loadArtifacts();
    if (lovableInput) art.lovableProject = lovableInput.value.trim();
    if (githubInput) art.githubRepo = githubInput.value.trim();
    if (liveInput) art.liveDeployment = liveInput.value.trim();
    saveArtifacts(art);

    var lovableErr = document.getElementById("jt-link-lovable-error");
    var githubErr = document.getElementById("jt-link-github-error");
    var liveErr = document.getElementById("jt-link-live-error");

    if (lovableErr && lovableInput) {
      var okL = !lovableInput.value || isValidUrl(lovableInput.value);
      lovableErr.style.display = okL ? "none" : "block";
    }
    if (githubErr && githubInput) {
      var okG = !githubInput.value || isValidUrl(githubInput.value);
      githubErr.style.display = okG ? "none" : "block";
    }
    if (liveErr && liveInput) {
      var okLive = !liveInput.value || isValidUrl(liveInput.value);
      liveErr.style.display = okLive ? "none" : "block";
    }

    updateProjectStatusUI();
  }

  function updateProjectStatusUI() {
    var testsMap = loadTests();
    var passed = getTestsPassedCount(testsMap);
    var totalTests = getAllTestIds().length;
    var testsOk = passed === totalTests;
    var artifactsOk = areArtifactsCompleteAndValid();

    var statusEl = document.getElementById("jt-project-status");
    var shipMsg = document.getElementById("jt-ship-message");
    var status = "Not Started";
    if (testsOk || artifactsOk) status = "In Progress";
    if (testsOk && artifactsOk) status = "Shipped";

    if (statusEl) {
      statusEl.textContent = status;
      statusEl.classList.remove("kn-status-badge--not-started", "kn-status-badge--in-progress", "kn-status-badge--shipped");
      if (status === "Not Started") statusEl.classList.add("kn-status-badge--not-started");
      else if (status === "In Progress") statusEl.classList.add("kn-status-badge--in-progress");
      else if (status === "Shipped") statusEl.classList.add("kn-status-badge--shipped");
    }
    if (shipMsg) {
      shipMsg.style.display = status === "Shipped" ? "block" : "none";
    }

    var stepBadges = document.querySelectorAll(".jt-step-status");
    Array.prototype.forEach.call(stepBadges, function (el) {
      var step = el.getAttribute("data-step");
      var completed = false;
      if (step === "8") {
        completed = testsOk && artifactsOk;
      } else {
        completed = testsOk;
      }
      el.textContent = completed ? "Completed" : "Pending";
    });
  }

  function initArtifactsForm() {
    applyArtifactsToForm();
    updateProjectStatusUI();
    var lovableInput = document.getElementById("jt-link-lovable");
    var githubInput = document.getElementById("jt-link-github");
    var liveInput = document.getElementById("jt-link-live");
    var handler = function () {
      updateArtifactsFromInputs();
    };
    if (lovableInput) {
      lovableInput.addEventListener("input", handler);
      lovableInput.addEventListener("blur", handler);
    }
    if (githubInput) {
      githubInput.addEventListener("input", handler);
      githubInput.addEventListener("blur", handler);
    }
    if (liveInput) {
      liveInput.addEventListener("input", handler);
      liveInput.addEventListener("blur", handler);
    }

    var copyBtn = document.getElementById("jt-copy-submission");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        if (!areArtifactsCompleteAndValid()) {
          showToast("Provide valid links before copying submission.");
          return;
        }
        var art = loadArtifacts();
        var text = [
          "------------------------------------------",
          "Job Notification Tracker \u2014 Final Submission",
          "",
          "Lovable Project:",
          art.lovableProject || "",
          "",
          "GitHub Repository:",
          art.githubRepo || "",
          "",
          "Live Deployment:",
          art.liveDeployment || "",
          "",
          "Core Features:",
          "- Intelligent match scoring",
          "- Daily digest simulation",
          "- Status tracking",
          "- Test checklist enforced",
          "------------------------------------------"
        ].join("\n");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
          showToast("Final submission copied.");
        }
      });
    }
  }

  function renderDashboard() {
    var grid = document.getElementById("job-grid");
    var empty = document.getElementById("job-empty");
    var prefsBanner = document.getElementById("prefs-banner");
    if (!grid) return;
    var keyword = document.getElementById("filter-keyword");
    var location = document.getElementById("filter-location");
    var mode = document.getElementById("filter-mode");
    var experience = document.getElementById("filter-experience");
    var source = document.getElementById("filter-source");
    var statusSel = document.getElementById("filter-status");
    var sort = document.getElementById("filter-sort");
    var onlyMatches = document.getElementById("filter-only-matches");
    var filtered = getFilteredJobs({
      keyword: keyword ? keyword.value : "",
      location: location ? location.value : "",
      mode: mode ? mode.value : "",
      experience: experience ? experience.value : "",
      source: source ? source.value : "",
      status: statusSel ? statusSel.value : "",
      sort: sort ? sort.value : "latest",
      onlyMatches: onlyMatches ? onlyMatches.checked : false
    });

    if (prefsBanner) {
      prefsBanner.style.display = hasPreferencesConfigured() ? "none" : "block";
    }

    if (empty) {
      empty.style.display = filtered.length ? "none" : "block";
    }
    grid.style.display = filtered.length ? "grid" : "none";
    grid.innerHTML = "";
    filtered.forEach(function (j) {
      renderJobCard(j, grid, { matchScore: j._matchScore });
    });
  }

  function renderSavedPage() {
    var grid = document.getElementById("saved-job-grid");
    var empty = document.getElementById("saved-empty");
    if (!grid || !empty) return;
    var ids = getSavedIds();
    var savedJobs = ids.map(getJobById).filter(Boolean);
    empty.style.display = savedJobs.length ? "none" : "block";
    grid.style.display = savedJobs.length ? "grid" : "none";
    grid.innerHTML = "";
    var prefs = loadPreferences() || getDefaultPreferences();
    savedJobs.forEach(function (j) {
      j._matchScore = computeMatchScore(j, prefs);
      renderJobCard(j, grid, { matchScore: j._matchScore });
    });
  }

  function populateLocationFilter() {
    var sel = document.getElementById("filter-location");
    if (sel) {
      var locs = getUniqueLocations();
      sel.innerHTML = "<option value=\"\">Location</option>";
      locs.forEach(function (l) {
        var opt = document.createElement("option");
        opt.value = l;
        opt.textContent = l;
        sel.appendChild(opt);
      });
    }

    var prefSel = document.getElementById("preferred-locations");
    if (prefSel) {
      var locs2 = getUniqueLocations();
      prefSel.innerHTML = "";
      locs2.forEach(function (l2) {
        var opt2 = document.createElement("option");
        opt2.value = l2;
        opt2.textContent = l2;
        prefSel.appendChild(opt2);
      });
    }
  }

  function openModal(job) {
    var overlay = document.getElementById("job-modal");
    var titleEl = document.getElementById("modal-title");
    var companyEl = document.getElementById("modal-company");
    var descEl = document.getElementById("modal-desc");
    var skillsEl = document.getElementById("modal-skills");
    var applyBtn = document.getElementById("modal-apply");
    var saveBtn = document.getElementById("modal-save");
    if (!overlay || !titleEl || !companyEl || !descEl || !skillsEl || !applyBtn || !saveBtn) return;
    titleEl.textContent = job.title || "";
    companyEl.textContent = job.company || "";
    descEl.textContent = job.description || "";
    skillsEl.innerHTML = "";
    (job.skills || []).forEach(function (s) {
      var span = document.createElement("span");
      span.className = "kn-modal__skill";
      span.textContent = s;
      skillsEl.appendChild(span);
    });
    saveBtn.textContent = isSaved(job.id) ? "Saved" : "Save";
    applyBtn.onclick = function () {
      if (job.applyUrl) window.open(job.applyUrl, "_blank");
    };
    saveBtn.onclick = function () {
      toggleSave(job, null);
      saveBtn.textContent = isSaved(job.id) ? "Saved" : "Save";
    };
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    var overlay = document.getElementById("job-modal");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function initFilters() {
    var keyword = document.getElementById("filter-keyword");
    var location = document.getElementById("filter-location");
    var mode = document.getElementById("filter-mode");
    var experience = document.getElementById("filter-experience");
    var source = document.getElementById("filter-source");
    var statusSel = document.getElementById("filter-status");
    var sort = document.getElementById("filter-sort");
    var onlyMatches = document.getElementById("filter-only-matches");
    var onChange = function () {
      renderDashboard();
    };
    if (keyword) keyword.addEventListener("input", onChange);
    if (location) location.addEventListener("change", onChange);
    if (mode) mode.addEventListener("change", onChange);
    if (experience) experience.addEventListener("change", onChange);
    if (source) source.addEventListener("change", onChange);
    if (statusSel) statusSel.addEventListener("change", onChange);
    if (sort) sort.addEventListener("change", onChange);
    if (onlyMatches) onlyMatches.addEventListener("change", onChange);
  }

  function readPreferencesFromForm() {
    var roleInput = document.getElementById("role-keywords");
    var locSelect = document.getElementById("preferred-locations");
    var modeCheckboxes = document.querySelectorAll(".kn-preferred-mode");
    var expSelect = document.getElementById("experience-level");
    var skillsInput = document.getElementById("preferred-skills");
    var minMatchInput = document.getElementById("min-match-score");

    var prefs = getDefaultPreferences();
    if (roleInput) {
      prefs.roleKeywords = parseCommaList(roleInput.value);
    }
    if (locSelect) {
      var selectedLocs = [];
      Array.prototype.forEach.call(locSelect.options, function (opt) {
        if (opt.selected) selectedLocs.push(opt.value);
      });
      prefs.preferredLocations = selectedLocs;
    }
    if (modeCheckboxes && modeCheckboxes.length) {
      var modes = [];
      Array.prototype.forEach.call(modeCheckboxes, function (cb) {
        if (cb.checked) modes.push(cb.value);
      });
      prefs.preferredModes = modes;
    }
    if (expSelect) {
      prefs.experienceLevel = expSelect.value || "";
    }
    if (skillsInput) {
      prefs.skills = parseCommaList(skillsInput.value);
    }
    if (minMatchInput) {
      var v = parseInt(minMatchInput.value, 10);
      if (isNaN(v)) v = 40;
      if (v < 0) v = 0;
      if (v > 100) v = 100;
      prefs.minMatchScore = v;
    }
    return prefs;
  }

  function applyPreferencesToForm(prefs) {
    prefs = prefs || getDefaultPreferences();
    var roleInput = document.getElementById("role-keywords");
    var locSelect = document.getElementById("preferred-locations");
    var modeCheckboxes = document.querySelectorAll(".kn-preferred-mode");
    var expSelect = document.getElementById("experience-level");
    var skillsInput = document.getElementById("preferred-skills");
    var minMatchInput = document.getElementById("min-match-score");
    var minMatchValue = document.getElementById("min-match-score-value");

    if (roleInput) {
      roleInput.value = (prefs.roleKeywords || []).join(", ");
    }
    if (locSelect && prefs.preferredLocations) {
      Array.prototype.forEach.call(locSelect.options, function (opt) {
        opt.selected = prefs.preferredLocations.indexOf(opt.value) >= 0;
      });
    }
    if (modeCheckboxes && prefs.preferredModes) {
      Array.prototype.forEach.call(modeCheckboxes, function (cb) {
        cb.checked = prefs.preferredModes.indexOf(cb.value) >= 0;
      });
    }
    if (expSelect) {
      expSelect.value = prefs.experienceLevel || "";
    }
    if (skillsInput) {
      skillsInput.value = (prefs.skills || []).join(", ");
    }
    if (minMatchInput) {
      var v = typeof prefs.minMatchScore === "number" ? prefs.minMatchScore : 40;
      minMatchInput.value = v;
      if (minMatchValue) {
        minMatchValue.textContent = String(v);
      }
    }
  }

  function initPreferences() {
    var prefs = loadPreferences() || getDefaultPreferences();
    applyPreferencesToForm(prefs);

    var form = document.getElementById("settings-form");
    if (!form) return;

    var minMatchInput = document.getElementById("min-match-score");
    var minMatchValue = document.getElementById("min-match-score-value");

    var onChange = function () {
      var p = readPreferencesFromForm();
      savePreferences(p);
      if (minMatchInput && minMatchValue) {
        var v = parseInt(minMatchInput.value, 10);
        if (!isNaN(v)) {
          minMatchValue.textContent = String(v);
        }
      }
      renderDashboard();
      renderSavedPage();
    };

    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);
  }

  function getTodayKey() {
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd;
  }

  function loadTodayDigest() {
    var key = "jobTrackerDigest_" + getTodayKey();
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function saveTodayDigest(digest) {
    var key = "jobTrackerDigest_" + getTodayKey();
    try {
      localStorage.setItem(key, JSON.stringify(digest));
    } catch (_) {
      // ignore
    }
  }

  function buildTodayDigest(prefs) {
    prefs = prefs || loadPreferences() || getDefaultPreferences();
    var threshold = typeof prefs.minMatchScore === "number" ? prefs.minMatchScore : 0;
    var scored = jobs.map(function (j) {
      var s = computeMatchScore(j, prefs);
      var d = j.postedDaysAgo != null ? j.postedDaysAgo : 999;
      return {
        jobId: j.id,
        score: s,
        postedDaysAgo: d
      };
    });
    scored = scored.filter(function (x) {
      return x.score >= threshold;
    });
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.postedDaysAgo - b.postedDaysAgo;
    });
    var top = scored.slice(0, 10);
    return {
      date: getTodayKey(),
      items: top
    };
  }

  function buildDigestPlainText(digest) {
    if (!digest || !Array.isArray(digest.items)) return "";
    var lines = [];
    var dateLabel = digest.date || getTodayKey();
    lines.push("Top 10 Jobs For You — 9AM Digest");
    lines.push("Date: " + dateLabel);
    lines.push("");
    var prefs = loadPreferences() || getDefaultPreferences();
    digest.items.forEach(function (item, idx) {
      var job = getJobById(item.jobId);
      if (!job) return;
      var score = typeof item.score === "number" ? item.score : computeMatchScore(job, prefs);
      lines.push((idx + 1) + ") " + (job.title || "") + " — " + (job.company || ""));
      lines.push("   Location: " + (job.location || "") + " | Experience: " + (job.experience || ""));
      lines.push("   Match: " + score + "% | Apply: " + (job.applyUrl || ""));
      lines.push("");
    });
    lines.push("This digest was generated based on your preferences.");
    return lines.join("\n");
  }

  function renderDigest(digest) {
    var card = document.getElementById("digest-card");
    var listEl = document.getElementById("digest-list");
    var dateEl = document.getElementById("digest-date");
    var empty = document.getElementById("digest-empty");
    var copyBtn = document.getElementById("digest-copy");
    var emailBtn = document.getElementById("digest-email");
    if (!card || !listEl || !empty) return;

    if (!digest || !digest.items || !digest.items.length) {
      card.style.display = "none";
      empty.style.display = "block";
      if (copyBtn) copyBtn.disabled = true;
      if (emailBtn) emailBtn.disabled = true;
      return;
    }

    listEl.innerHTML = "";
    var dateLabel = digest.date || getTodayKey();
    try {
      var d = new Date(digest.date);
      if (!isNaN(d.getTime())) {
        dateLabel = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      }
    } catch (_) {
      // fallback to raw
    }
    if (dateEl) {
      dateEl.textContent = dateLabel;
    }

    var prefs = loadPreferences() || getDefaultPreferences();
    digest.items.forEach(function (item) {
      var job = getJobById(item.jobId);
      if (!job) return;
      var row = document.createElement("div");
      row.className = "kn-digest-item";

      var title = document.createElement("p");
      title.className = "kn-digest-item__title";
      title.textContent = job.title || "";

      var meta1 = document.createElement("p");
      meta1.className = "kn-digest-item__meta";
      meta1.textContent = (job.company || "") + " · " + (job.location || "");

      var meta2 = document.createElement("p");
      meta2.className = "kn-digest-item__meta";
      meta2.textContent = "Experience: " + (job.experience || "");

      var footer = document.createElement("div");
      footer.className = "kn-digest-item__footer";

      var matchSpan = document.createElement("span");
      matchSpan.className = "kn-digest-item__match";
      var score = typeof item.score === "number" ? item.score : computeMatchScore(job, prefs);
      matchSpan.textContent = "Match " + score + "%";

      var applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.className = "kn-btn kn-btn--primary";
      applyBtn.textContent = "Apply";
      applyBtn.addEventListener("click", function () {
        if (job.applyUrl) window.open(job.applyUrl, "_blank");
      });

      footer.appendChild(matchSpan);
      footer.appendChild(applyBtn);

      row.appendChild(title);
      row.appendChild(meta1);
      row.appendChild(meta2);
      row.appendChild(footer);

      listEl.appendChild(row);
    });

    empty.style.display = "none";
    card.style.display = "block";
    if (copyBtn) copyBtn.disabled = false;
    if (emailBtn) emailBtn.disabled = false;
  }

  function getStatusUpdates() {
    var map = loadStatusMap();
    var updates = [];
    Object.keys(map).forEach(function (id) {
      var entry = map[id];
      if (!entry || !entry.status || !entry.changedAt) return;
      updates.push({
        jobId: id,
        status: entry.status,
        changedAt: entry.changedAt
      });
    });
    updates.sort(function (a, b) {
      var da = new Date(a.changedAt).getTime();
      var db = new Date(b.changedAt).getTime();
      return db - da;
    });
    return updates.slice(0, 10);
  }

  function renderStatusUpdates() {
    var listEl = document.getElementById("status-updates-list");
    var emptyEl = document.getElementById("status-updates-empty");
    if (!listEl || !emptyEl) return;
    listEl.innerHTML = "";
    var updates = getStatusUpdates();
    if (!updates.length) {
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";
    updates.forEach(function (u) {
      var job = getJobById(u.jobId);
      if (!job) return;
      var row = document.createElement("div");
      row.className = "kn-digest-item";

      var title = document.createElement("p");
      title.className = "kn-digest-item__title";
      title.textContent = (job.title || "") + " — " + (job.company || "");

      var meta = document.createElement("p");
      meta.className = "kn-digest-item__meta";
      var d = new Date(u.changedAt);
      var dateLabel = isNaN(d.getTime()) ? u.changedAt : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      meta.textContent = u.status + " · " + dateLabel;

      row.appendChild(title);
      row.appendChild(meta);
      listEl.appendChild(row);
    });
  }

  function refreshDigestView() {
    var prefsBlock = document.getElementById("digest-prefs-block");
    var generateBtn = document.getElementById("digest-generate");
    var empty = document.getElementById("digest-empty");
    var card = document.getElementById("digest-card");
    var copyBtn = document.getElementById("digest-copy");
    var emailBtn = document.getElementById("digest-email");

    if (!generateBtn || !empty || !card) return;

    var hasPrefs = hasPreferencesConfigured();
    if (!hasPrefs) {
      if (prefsBlock) prefsBlock.style.display = "block";
      generateBtn.disabled = true;
      empty.style.display = "none";
      card.style.display = "none";
      if (copyBtn) copyBtn.disabled = true;
      if (emailBtn) emailBtn.disabled = true;
      return;
    }

    if (prefsBlock) prefsBlock.style.display = "none";
    generateBtn.disabled = false;

    var digest = loadTodayDigest();
    if (digest && digest.items && digest.items.length) {
      renderDigest(digest);
    } else {
      card.style.display = "none";
      empty.style.display = "block";
      if (copyBtn) copyBtn.disabled = true;
      if (emailBtn) emailBtn.disabled = true;
    }
    renderStatusUpdates();
  }

  function initDigest() {
    var generateBtn = document.getElementById("digest-generate");
    var copyBtn = document.getElementById("digest-copy");
    var emailBtn = document.getElementById("digest-email");

    if (generateBtn) {
      generateBtn.addEventListener("click", function () {
        if (!hasPreferencesConfigured()) {
          refreshDigestView();
          return;
        }
        var existing = loadTodayDigest();
        var digest;
        if (existing && existing.items && existing.items.length) {
          digest = existing;
        } else {
          var prefs = loadPreferences() || getDefaultPreferences();
          digest = buildTodayDigest(prefs);
          if (!digest.items.length) {
            var empty = document.getElementById("digest-empty");
            var card = document.getElementById("digest-card");
            if (empty) {
              empty.style.display = "block";
              var titleEl = empty.querySelector(".kn-empty-state__title");
              var textEl = empty.querySelector(".kn-empty-state__text");
              if (titleEl) titleEl.textContent = "No matching roles today.";
              if (textEl) textEl.textContent = "Check again tomorrow.";
            }
            if (card) card.style.display = "none";
            if (copyBtn) copyBtn.disabled = true;
            if (emailBtn) emailBtn.disabled = true;
            return;
          }
          saveTodayDigest(digest);
        }
        renderDigest(digest);
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var digest = loadTodayDigest();
        if (!digest || !digest.items || !digest.items.length) return;
        var text = buildDigestPlainText(digest);
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
        }
      });
    }

    if (emailBtn) {
      emailBtn.addEventListener("click", function () {
        var digest = loadTodayDigest();
        if (!digest || !digest.items || !digest.items.length) return;
        var text = buildDigestPlainText(digest);
        if (!text) return;
        var subject = encodeURIComponent("My 9AM Job Digest");
        var body = encodeURIComponent(text);
        var href = "mailto:?subject=" + subject + "&body=" + body;
        window.location.href = href;
      });
    }

    refreshDigestView();
  }

  function initModal() {
    var overlay = document.getElementById("job-modal");
    var closeBtn = document.getElementById("modal-close");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeModal();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && overlay.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  function onRouteChange(route) {
    if (route === "dashboard") {
      renderDashboard();
    } else if (route === "saved") {
      renderSavedPage();
    } else if (route === "digest") {
      refreshDigestView();
    }
  }

  function init() {
    populateLocationFilter();
    initFilters();
    initModal();
    initPreferences();
    initArtifactsForm();
    initTestsChecklist();
    initDigest();
    renderDashboard();
    renderSavedPage();

    var origSync = window._knSyncFromHash;
    if (typeof origSync === "function") {
      window._knSyncFromHash = function () {
        origSync();
        var route = window.location.hash.slice(1) || "landing";
        onRouteChange(route);
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("hashchange", function () {
    var raw = window.location.hash.slice(1) || "landing";
    var lower = raw.toLowerCase();
    if (lower === "jt/08-ship" && !canShipProject1()) {
      showToast("Resolve all issues before shipping.");
      if (window.location.hash.toLowerCase() !== "#jt/07-test") {
        window.location.hash = "jt/07-test";
      }
      return;
    }
    onRouteChange(raw);
  });

  window.JobTrackerApp = {
    renderDashboard: renderDashboard,
    renderSavedPage: renderSavedPage,
    getSavedIds: getSavedIds,
    onRouteChange: onRouteChange
  };
})();
