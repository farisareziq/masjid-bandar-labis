/* ============================================================
   MASJID BANDAR LABIS — prayer-times.js
   Waktu solat harian daripada API JAKIM e-Solat (zon JHR04 —
   Batu Pahat, Muar, Segamat, Gemas Johor, Tangkak).
   Semua data dinamik dibina menggunakan DOM (textContent) —
   bebas daripada risiko XSS.
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  var root = document.getElementById("prayerWidget");
  if (!root) return;

  var ZONE = "JHR04";
  var ZONE_LABEL = "Segamat, Johor";
  var API_URL =
    "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=today&zone=" +
    encodeURIComponent(ZONE);

  var ORDER = ["subuh", "zohor", "asar", "maghrib", "isyak"];
  // Padanan nama bahasa dengan medan API JAKIM
  var FIELDS = {
    subuh: "fajr",
    zohor: "dhuhr",
    asar: "asr",
    maghrib: "maghrib",
    isyak: "isha",
  };
  var NAMES = {
    subuh: "Subuh",
    zohor: "Zohor",
    asar: "Asar",
    maghrib: "Maghrib",
    isyak: "Isyak",
  };
  var ICONS = {
    subuh: "\u{1F305}",
    zohor: "\u2600\uFE0F",
    asar: "\u{1F324}\uFE0F",
    maghrib: "\u{1F306}",
    isyak: "\u{1F319}",
  };
  // Waktu anggaran sebagai fallback jika API tidak dapat dicapai / tiada rekod
  var FALLBACK = {
    fajr: "05:50",
    dhuhr: "13:15",
    asr: "16:35",
    maghrib: "19:20",
    isha: "20:30",
  };

  // Bantuan terjemahan
  function L(key, fb) {
    return window.I18N ? I18N.t(key) : fb;
  }
  var lastState = null;

  fetchTimes();

  async function fetchTimes() {
    try {
      var res = await fetch(API_URL);
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      var record = getRecord(data);
      if (record) {
        lastState = { record: record, fallback: false };
        render(record, false);
        startCountdown(record);
      } else {
        lastState = { record: FALLBACK, fallback: true };
        render(FALLBACK, true);
      }
    } catch (err) {
      lastState = { record: FALLBACK, fallback: true };
      render(FALLBACK, true);
    }
  }

  // API JAKIM menggunakan dua bentuk respons berbeza — kendalikan kedua-duanya
  function getRecord(data) {
    if (!data) return null;
    if (data.status && data.status.indexOf("OK") !== -1) {
      if (Array.isArray(data.prayerTime) && data.prayerTime.length) {
        return data.prayerTime[0];
      }
      if (data.records && Array.isArray(data.records) && data.records.length) {
        return data.records[0];
      }
    }
    if (data.records && Array.isArray(data.records) && data.records.length) {
      return data.records[0];
    }
    return null;
  }

  function render(record, isFallback) {
    root.textContent = ""; // buang "Memuatkan..."

    var container = document.createElement("div");
    container.className = "container";
    root.appendChild(container);

    var wrap = document.createElement("div");
    wrap.className = "prayer-wrap";
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", L("prayer.title", "Waktu solat hari ini"));

    // ---------- Kepala ----------
    var head = document.createElement("div");
    head.className = "prayer-head";

    var h3 = document.createElement("h3");
    h3.textContent = "\u{1F54C} " + L("prayer.title", "Waktu Solat Hari Ini");
    head.appendChild(h3);

    var date = document.createElement("p");
    var now = new Date();
    date.textContent =
      now.toLocaleDateString("ms-MY", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }) +
      " | " +
      L("prayer.zone", "Zon") +
      " " +
      ZONE_LABEL;
    head.appendChild(date);

    wrap.appendChild(head);

    // ---------- Grid waktu ----------
    var grid = document.createElement("div");
    grid.className = "prayer-grid";

    ORDER.forEach(function (key) {
      var apiField = FIELDS[key];
      var raw = record[apiField];
      var timeText = formatTime(raw);

      var card = document.createElement("div");
      card.className = "prayer-card";

      var icon = document.createElement("div");
      icon.className = "prayer-icon";
      icon.textContent = ICONS[key];
      card.appendChild(icon);

      var name = document.createElement("div");
      name.className = "prayer-name";
      name.textContent = NAMES[key];
      card.appendChild(name);

      var time = document.createElement("div");
      time.className = "prayer-time";
      time.textContent = timeText;
      card.appendChild(time);

      grid.appendChild(card);
    });

    wrap.appendChild(grid);

    // ---------- Kiraan masa seterusnya ----------
    var cd = document.createElement("div");
    cd.className = "prayer-countdown";
    cd.id = "prayerCountdown";
    var cdLabel = document.createElement("p");
    cdLabel.className = "cd-label";
    cdLabel.textContent = "Mengira waktu solat seterusnya...";
    cd.appendChild(cdLabel);
    var cdTime = document.createElement("span");
    cdTime.className = "cd-time";
    cd.appendChild(cdTime);
    wrap.appendChild(cd);

    // ---------- Sumber / notis ----------
    var foot = document.createElement("div");
    foot.className = "prayer-foot";
    if (isFallback) {
      var badge = document.createElement("span");
      badge.className = "prayer-badge";
      badge.textContent = L("prayer.estimate", "Waktu anggaran (API JAKIM tidak dapat dicapai)");
      foot.appendChild(badge);
    }
    var src = document.createElement("p");
    src.textContent = L("prayer.source", "Sumber: JAKIM e-Solat \u00B7 zon " + ZONE);
    foot.appendChild(src);
    wrap.appendChild(foot);

    container.appendChild(wrap);
  }

  function formatTime(raw) {
    if (!raw) return "--:--";
    var parts = String(raw).trim().split(":");
    var hh = parts[0] || "--";
    var mm = parts[1] || "--";
    return hh + ":" + mm;
  }

  function startCountdown(record) {
    function update() {
      var now = new Date();
      var currentMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      var next = null;
      var nextMin = null;

      ORDER.forEach(function (key) {
        var raw = record[FIELDS[key]];
        if (!raw) return;
        var parts = String(raw).trim().split(":");
        var pm = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        if (!next && pm > currentMin) {
          next = key;
          nextMin = pm;
        }
      });

      // Tiada solat lagi hari ini -> subuh esok
      if (!next) {
        var subuh = String(record[FIELDS.subuh] || "05:50").trim().split(":");
        next = "subuh";
        nextMin = parseInt(subuh[0], 10) * 60 + parseInt(subuh[1], 10) + 1440;
      }

      var diff = Math.round((nextMin - currentMin) * 60);
      var h = Math.floor(diff / 3600);
      var m = Math.floor((diff % 3600) / 60);
      var s = diff % 60;

      var cdLabel = root.querySelector(".cd-label");
      var cdTime = root.querySelector(".cd-time");
      if (cdLabel) {
        cdLabel.textContent =
          L("prayer.next", "Waktu ") + NAMES[next] + L("prayer.in", " dalam:");
      }
      if (cdTime) {
        cdTime.textContent =
          pad2(h) + ":" + pad2(m) + ":" + pad2(s);
      }
    }

    update();
    setInterval(update, 1000);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // Terjemah semula widget bila bahasa ditukar
  document.addEventListener("langchange", function () {
    if (lastState) {
      render(lastState.record, lastState.fallback);
      startCountdown(lastState.record);
    }
  });
});
