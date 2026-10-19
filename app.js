// Initial Sample Data (Default)
const DEFAULT_DATA = {
  tasks: [
    { id: "t1", title: "Q4 사업계획서 임원 보고 자료 완성", priority: "A", completedDates: [], role: "직무/비즈니스", recurrence: { type: "none" } },
    { id: "t2", title: "주요 클라이언트 계약서 법무 검토 요청", priority: "A", completedDates: [], role: "직무/비즈니스", recurrence: { type: "none" } },
    { id: "t3", title: "주말 가족 여행 숙소 및 식당 예약", priority: "A", completedDates: ["2026-10-10"], role: "가족/관계", recurrence: { type: "none" } },
    { id: "t4", title: "팀원 1:1 면담 (역량 개발 피드백)", priority: "B", completedDates: [], role: "직무/비즈니스", recurrence: { type: "custom", days: ["화", "목"] } },
    { id: "t5", title: "헬스장 하체 루틴 운동 (1시간)", priority: "B", completedDates: [], role: "자기계발/건강", recurrence: { type: "daily" } },
    { id: "t6", title: "생산성 향상 신간 도서 독서 (30분)", priority: "C", completedDates: [], role: "자기계발/건강", recurrence: { type: "weekdays" } },
    { id: "t7", title: "서재 책상 및 데스크탑 정리", priority: "C", completedDates: [], role: "개인", recurrence: { type: "none" } }
  ],
  schedules: [
    { id: "s1", title: "Google Sync: 전략기획팀 주간 회의", startTime: "09:00", endTime: "10:30", type: "work" },
    { id: "s2", title: "Covey Block: [A1] Q4 사업계획서 집중 작성", startTime: "10:30", endTime: "12:00", type: "timeblock" },
    { id: "s3", title: "점심 식사 & 티타임", startTime: "12:00", endTime: "13:00", type: "personal" },
    { id: "s4", title: "Google Sync: 팀원 1:1 면담", startTime: "14:00", endTime: "15:00", type: "work" }
  ],
  journals: [], // Completely emptied sample journals
  compassRoles: [
    {
      role: "👨‍💼 직무 / 비즈니스",
      rocks: [
        { id: "r1", text: "Q4 사업계획서 초안 완벽 마무리", assignedToday: true },
        { id: "r2", text: "신임 팀원 온보딩 커리큘럼 설계", assignedToday: false }
      ]
    },
    {
      role: "👨‍👩‍👧 가족 / 관계",
      rocks: [
        { id: "r3", text: "아이와 함께 주말 가을 나들이 가기", assignedToday: true },
        { id: "r4", text: "부모님께 안부 전화 드리기", assignedToday: false }
      ]
    },
    {
      role: "🧘 자기계발 / 건강",
      rocks: [
        { id: "r5", text: "주 3회 웨이트 트레이닝 완수", assignedToday: false },
        { id: "r6", text: "매일 아침 10분 명상 & 하루 계획 세우기", assignedToday: false }
      ]
    }
  ]
};

// Application State
let appData = { ...DEFAULT_DATA };
let currentPriority = "A";
let currentRepeatType = "none";
let selectedCustomDays = ["월", "수", "금"];
let currentJournalTag = "memo";
let sortableInstances = [];
let pendingDeleteTaskId = null;
let editingTaskId = null;
let editSelectedPriority = "A";
let editSelectedRepeat = "none";
let editSelectedCustomDays = [];

let editingJournalId = null;
let editJournalSelectedTag = "memo";
let editingScheduleId = null;

// Helper: format Date to YYYY-MM-DD in local time
function formatDateToStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

// Date Navigation State (Always reflects real today)
const realNow = new Date();
const TODAY_BASE_DATE = new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate());
let currentViewDate = new Date(TODAY_BASE_DATE);
const TODAY_STR = formatDateToStr(TODAY_BASE_DATE);

// Helper: get current view date string (YYYY-MM-DD)
function getCurViewDateStr() {
  return formatDateToStr(currentViewDate);
}

// Check if task is completed on a specific view date
// - Only completed on the exact date(s) it was checked
// - Other days (tomorrow, future, past) remain unchecked so the user can re-check as daily repeats
function isTaskCompletedOnDate(task, dateStr) {
  if (!task) return false;
  if (Array.isArray(task.completedDates)) {
    return task.completedDates.includes(dateStr);
  }
  if (task.completedDate) {
    return task.completedDate === dateStr;
  }
  return false;
}

// Google Calendar Exclusive Monthly Events (Only past/today events, future removed per request)
const GOOGLE_CALENDAR_EVENTS = [
  { id: "g1", date: "2026-10-06", time: "10:00 ~ 11:30", title: "구글 캘린더: Q4 제품 로드맵 회의", location: "Google Meet" },
  { id: "g2", date: "2026-10-08", time: "14:00 ~ 15:00", title: "구글 캘린더: 파트너사 비즈니스 미팅", location: "대회의실" },
  { id: "g3", date: "2026-10-10", time: "09:00 ~ 10:30", title: "구글 캘린더: 전략기획팀 주간 정기회의", location: "Google Meet" },
  { id: "g4", date: "2026-10-10", time: "14:00 ~ 15:00", title: "구글 캘린더: 신규 팀원 1:1 면담", location: "소회의실 B" }
];

let calCurrentYear = TODAY_BASE_DATE.getFullYear();
let calCurrentMonth = TODAY_BASE_DATE.getMonth(); // 0-indexed
let calSelectedDateStr = TODAY_STR;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Clear obsolete service worker caches if present
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name !== "covey-modern-cache-v5") {
          caches.delete(name);
        }
      });
    });
  }

  loadData();
  lucide.createIcons();
  setupEventListeners();
  setupSortables();
  renderAll();

  // Register Service Worker for Complete Offline Support (Works even when PC is OFF)
  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.register("./sw.js").then((reg) => {
      console.log("Service Worker Registered - Offline Mode Ready");
      reg.update(); // Force check update
    }).catch((err) => {
      console.warn("Service Worker registration failed:", err);
    });
  }
});

// Load from LocalStorage if available with Automatic Version Migration
function loadData() {
  let saved = localStorage.getItem("covey_modern_data_v2");
  
  if (saved) {
    try {
      appData = JSON.parse(saved);
      // Migration: ensure completedDates array is initialized
      if (appData && Array.isArray(appData.tasks)) {
        appData.tasks.forEach(task => {
          if (!Array.isArray(task.completedDates)) {
            task.completedDates = [];
            if (task.completedDate) {
              task.completedDates.push(task.completedDate);
            } else if (task.completed) {
              task.completedDates.push("2026-10-10");
            }
          }
          delete task.completedDate;
        });
      }
      return;
    } catch (e) {
      console.error("Failed to parse v2 data", e);
    }
  }

  // Check older v1 storage to recover user's previous tasks and journals
  const legacySaved = localStorage.getItem("covey_modern_data");
  if (legacySaved) {
    try {
      const legacyData = JSON.parse(legacySaved);
      appData = {
        tasks: legacyData.tasks || DEFAULT_DATA.tasks,
        schedules: legacyData.schedules || DEFAULT_DATA.schedules,
        journals: legacyData.journals || [],
        compassRoles: legacyData.compassRoles || DEFAULT_DATA.compassRoles
      };
      if (appData && Array.isArray(appData.tasks)) {
        appData.tasks.forEach(task => {
          if (!Array.isArray(task.completedDates)) {
            task.completedDates = [];
            if (task.completedDate) {
              task.completedDates.push(task.completedDate);
            } else if (task.completed) {
              task.completedDates.push("2026-10-10");
            }
          }
          delete task.completedDate;
        });
      }
      saveData(); // Migrate to v2 immediately
      console.log("Successfully restored user data from legacy storage");
      return;
    } catch (e) {
      console.error("Failed to restore legacy data", e);
    }
  }

  // Default fallback
  appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
  saveData();
}

function saveData() {
  try {
    const serialized = JSON.stringify(appData);
    localStorage.setItem("covey_modern_data_v2", serialized);
    localStorage.setItem("covey_modern_data", serialized); // Also keep backward compatible
  } catch (e) {
    console.error("Failed to save data to localStorage", e);
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Theme Toggle
  const themeToggle = document.getElementById("themeToggle");
  themeToggle?.addEventListener("click", () => {
    document.body.classList.toggle("theme-dark");
    const isDark = document.body.classList.contains("theme-dark");
    themeToggle.innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    lucide.createIcons();
  });

  // Date Navigation (Prev / Next / Today)
  document.getElementById("prevDayBtn")?.addEventListener("click", () => {
    currentViewDate.setDate(currentViewDate.getDate() - 1);
    updateDateDisplay();
  });

  document.getElementById("nextDayBtn")?.addEventListener("click", () => {
    currentViewDate.setDate(currentViewDate.getDate() + 1);
    updateDateDisplay();
  });

  document.getElementById("datePickerTrigger")?.addEventListener("click", () => {
    currentViewDate = new Date(TODAY_BASE_DATE);
    updateDateDisplay();
    showToast("오늘 날짜로 이동했습니다.");
  });

  // Reset Data
  document.getElementById("resetDemoData")?.addEventListener("click", () => {
    if (confirm("데모 데이터를 초기 상태로 리셋하시겠습니까?")) {
      appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
      saveData();
      renderAll();
      showToast("데모 데이터가 초기화되었습니다.");
    }
  });

  // 3-Segment Tab Switch
  const tabs = document.querySelectorAll(".segment-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetView = tab.dataset.tab;
      document.querySelectorAll(".view-panel").forEach(panel => {
        panel.classList.remove("active");
      });

      if (targetView === "tasks") document.getElementById("tasksView")?.classList.add("active");
      if (targetView === "schedule") document.getElementById("scheduleView")?.classList.add("active");
      if (targetView === "journal") document.getElementById("journalView")?.classList.add("active");
    });
  });

  // Task Priority Selector Chips
  const priorityChips = document.querySelectorAll(".priority-chip");
  priorityChips.forEach(chip => {
    chip.addEventListener("click", () => {
      priorityChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentPriority = chip.dataset.priority;
    });
  });

  // Recurrence Type Selector Chips
  const repeatChips = document.querySelectorAll(".repeat-type-chip");
  const customDaysPicker = document.getElementById("customDaysPicker");
  
  repeatChips.forEach(chip => {
    chip.addEventListener("click", () => {
      repeatChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentRepeatType = chip.dataset.repeat;

      if (currentRepeatType === "custom") {
        if (customDaysPicker) customDaysPicker.style.display = "flex";
      } else {
        if (customDaysPicker) customDaysPicker.style.display = "none";
      }
    });
  });

  // Custom Day Selection Chips
  const dayChips = document.querySelectorAll(".day-chip");
  // Set initial selected days
  dayChips.forEach(chip => {
    if (selectedCustomDays.includes(chip.dataset.day)) {
      chip.classList.add("active");
    }
    chip.addEventListener("click", () => {
      const day = chip.dataset.day;
      if (selectedCustomDays.includes(day)) {
        selectedCustomDays = selectedCustomDays.filter(d => d !== day);
        chip.classList.remove("active");
      } else {
        selectedCustomDays.push(day);
        chip.classList.add("active");
      }
    });
  });

  // Add Task
  const addTaskBtn = document.getElementById("addTaskBtn");
  const newTaskInput = document.getElementById("newTaskInput");

  const handleAddTask = () => {
    const text = newTaskInput.value.trim();
    if (!text) return;

    const recurrenceObj = {
      type: currentRepeatType,
      days: currentRepeatType === "custom" ? [...selectedCustomDays] : []
    };

    const newTask = {
      id: "t_" + Date.now(),
      title: text,
      priority: currentPriority,
      completed: false,
      completedDates: [],
      role: "일반",
      recurrence: recurrenceObj
    };

    appData.tasks.push(newTask);
    saveData();
    newTaskInput.value = "";
    renderTasks();

    let repeatMsg = "";
    if (currentRepeatType === "daily") repeatMsg = " (매일 반복)";
    else if (currentRepeatType === "weekdays") repeatMsg = " (평일 반복)";
    else if (currentRepeatType === "custom" && recurrenceObj.days.length > 0) repeatMsg = ` (${recurrenceObj.days.join(",")} 반복)`;

    showToast(`${currentPriority} 등급에 새 우선업무가 등록되었습니다${repeatMsg}.`);
  };

  addTaskBtn?.addEventListener("click", handleAddTask);
  newTaskInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAddTask();
  });

  // Compass Drawer Toggle
  const compassToggleBtn = document.getElementById("compassToggleBtn");
  const closeCompassBtn = document.getElementById("closeCompassBtn");
  const compassDrawer = document.getElementById("compassDrawer");
  const compassBackdrop = document.getElementById("compassBackdrop");

  const openCompass = () => {
    compassDrawer?.classList.add("active");
    compassBackdrop?.classList.add("active");
  };

  const closeCompass = () => {
    compassDrawer?.classList.remove("active");
    compassBackdrop?.classList.remove("active");
  };

  compassToggleBtn?.addEventListener("click", openCompass);
  closeCompassBtn?.addEventListener("click", closeCompass);
  compassBackdrop?.addEventListener("click", closeCompass);

  // Add Big Rock in Compass
  document.getElementById("addRockBtn")?.addEventListener("click", () => {
    const roleName = document.getElementById("roleSelector").value;
    const rockInput = document.getElementById("newRockInput");
    const text = rockInput.value.trim();
    if (!text) return;

    let roleObj = appData.compassRoles.find(r => r.role.includes(roleName));
    if (!roleObj) {
      roleObj = { role: roleName, rocks: [] };
      appData.compassRoles.push(roleObj);
    }
    roleObj.rocks.push({ id: "r_" + Date.now(), text: text, assignedToday: false });
    saveData();
    rockInput.value = "";
    renderCompass();
    showToast("새 주간 핵심 과제(Big Rock)가 등록되었습니다.");
  });

  // Journal Tags
  const journalChips = document.querySelectorAll(".j-tag-chip");
  journalChips.forEach(chip => {
    chip.addEventListener("click", () => {
      journalChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentJournalTag = chip.dataset.tag;
    });
  });

  // Add Journal Note
  document.getElementById("addJournalBtn")?.addEventListener("click", () => {
    const textarea = document.getElementById("newJournalInput");
    const content = textarea.value.trim();
    if (!content) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    appData.journals.unshift({
      id: "j_" + Date.now(),
      time: timeStr,
      tag: currentJournalTag,
      content: content
    });
    saveData();
    textarea.value = "";
    renderJournals();
    showToast("하루 기록이 저장되었습니다.");
  });

  // Edit Task Modal Handlers
  const editModal = document.getElementById("editTaskModal");
  const closeEditModal = () => {
    editModal?.classList.remove("active");
    editingTaskId = null;
  };

  document.getElementById("closeEditModal")?.addEventListener("click", closeEditModal);
  document.getElementById("cancelEditBtn")?.addEventListener("click", closeEditModal);

  // Edit Priority Chips
  const editPriorityChips = [
    document.getElementById("editPriorityA"),
    document.getElementById("editPriorityB"),
    document.getElementById("editPriorityC")
  ];
  editPriorityChips.forEach(chip => {
    chip?.addEventListener("click", () => {
      editPriorityChips.forEach(c => c?.classList.remove("active"));
      chip.classList.add("active");
      editSelectedPriority = chip.dataset.priority;
    });
  });

  // Edit Repeat Chips
  const editRepeatChips = [
    document.getElementById("editRepeatNone"),
    document.getElementById("editRepeatDaily"),
    document.getElementById("editRepeatWeekdays"),
    document.getElementById("editRepeatCustom")
  ];
  const editCustomDaysPicker = document.getElementById("editCustomDaysPicker");
  editRepeatChips.forEach(chip => {
    chip?.addEventListener("click", () => {
      editRepeatChips.forEach(c => c?.classList.remove("active"));
      chip.classList.add("active");
      editSelectedRepeat = chip.dataset.repeat;

      if (editSelectedRepeat === "custom") {
        if (editCustomDaysPicker) editCustomDaysPicker.style.display = "flex";
      } else {
        if (editCustomDaysPicker) editCustomDaysPicker.style.display = "none";
      }
    });
  });

  // Edit Custom Day Chips
  const editDayChips = document.querySelectorAll(".edit-day-chip");
  editDayChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const day = chip.dataset.day;
      if (editSelectedCustomDays.includes(day)) {
        editSelectedCustomDays = editSelectedCustomDays.filter(d => d !== day);
        chip.classList.remove("active");
      } else {
        editSelectedCustomDays.push(day);
        chip.classList.add("active");
      }
    });
  });

  // Save Task Edit Button
  document.getElementById("saveEditBtn")?.addEventListener("click", () => {
    if (!editingTaskId) return;
    const task = appData.tasks.find(t => t.id === editingTaskId);
    if (!task) return;

    const newTitle = document.getElementById("editTaskTitleInput").value.trim();
    if (!newTitle) {
      alert("업무 제목을 입력해 주세요.");
      return;
    }

    const newRole = document.getElementById("editTaskRoleSelect").value;

    task.title = newTitle;
    task.priority = editSelectedPriority;
    task.role = newRole;
    task.recurrence = {
      type: editSelectedRepeat,
      days: editSelectedRepeat === "custom" ? [...editSelectedCustomDays] : []
    };

    saveData();
    renderTasks();
    closeEditModal();
    showToast(`'${task.title}' 업무가 수정되었습니다.`);
  });

  // Edit Journal Modal Handlers
  const editJournalModal = document.getElementById("editJournalModal");
  const closeEditJournalModal = () => {
    editJournalModal?.classList.remove("active");
    editingJournalId = null;
  };

  document.getElementById("closeEditJournalModal")?.addEventListener("click", closeEditJournalModal);
  document.getElementById("cancelEditJournalBtn")?.addEventListener("click", closeEditJournalModal);

  // Edit Journal Tag Chips
  const editJTagChips = document.querySelectorAll(".edit-j-tag");
  editJTagChips.forEach(chip => {
    chip.addEventListener("click", () => {
      editJTagChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      editJournalSelectedTag = chip.dataset.tag;
    });
  });

  // Save Edit Journal
  document.getElementById("saveEditJournalBtn")?.addEventListener("click", () => {
    if (!editingJournalId) return;
    const journal = appData.journals.find(j => j.id === editingJournalId);
    if (!journal) return;

    const timeVal = document.getElementById("editJournalTimeInput").value;
    const contentVal = document.getElementById("editJournalContentInput").value.trim();

    if (!contentVal) {
      alert("기록 내용을 입력해 주세요.");
      return;
    }

    journal.time = timeVal || journal.time;
    journal.tag = editJournalSelectedTag;
    journal.content = contentVal;

    saveData();
    renderJournals();
    closeEditJournalModal();
    showToast("기록이 수정되었습니다.");
  });

  // Delete Choice Modal Handlers
  const deleteModal = document.getElementById("deleteChoiceModal");
  const closeDeleteModal = () => {
    deleteModal?.classList.remove("active");
    pendingDeleteTaskId = null;
  };

  document.getElementById("closeDeleteModal")?.addEventListener("click", closeDeleteModal);
  document.getElementById("cancelDeleteBtn")?.addEventListener("click", closeDeleteModal);

  // Delete Today Only
  document.getElementById("btnDeleteTodayOnly")?.addEventListener("click", () => {
    if (pendingDeleteTaskId) {
      performDelete(pendingDeleteTaskId, "today_only");
    }
    closeDeleteModal();
  });

  // Delete All Future
  document.getElementById("btnDeleteAllFuture")?.addEventListener("click", () => {
    if (pendingDeleteTaskId) {
      performDelete(pendingDeleteTaskId, "all_future");
    }
    closeDeleteModal();
  });

  // Schedule Sub-tab Switcher (Daily Timeline vs Monthly Google Calendar)
  const schedSubtabs = document.querySelectorAll(".sched-subtab");
  const dailyPanel = document.getElementById("dailyTimelinePanel");
  const monthlyPanel = document.getElementById("monthlyCalendarPanel");

  schedSubtabs.forEach(tab => {
    tab.addEventListener("click", () => {
      schedSubtabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const subview = tab.dataset.subview;
      if (subview === "daily") {
        if (dailyPanel) dailyPanel.style.display = "flex";
        if (monthlyPanel) monthlyPanel.style.display = "none";
      } else {
        if (dailyPanel) dailyPanel.style.display = "none";
        if (monthlyPanel) {
          monthlyPanel.style.display = "flex";
          renderMonthlyGoogleCalendar();
        }
      }
    });
  });

  // Month Navigation
  document.getElementById("prevMonthBtn")?.addEventListener("click", () => {
    calCurrentMonth--;
    if (calCurrentMonth < 0) {
      calCurrentMonth = 11;
      calCurrentYear--;
    }
    renderMonthlyGoogleCalendar();
  });

  document.getElementById("nextMonthBtn")?.addEventListener("click", () => {
    calCurrentMonth++;
    if (calCurrentMonth > 11) {
      calCurrentMonth = 0;
      calCurrentYear++;
    }
    renderMonthlyGoogleCalendar();
  });

  // Schedule Modal Handlers (Add / Edit / Delete)
  const eventModal = document.getElementById("eventModal");
  const deleteEventBtn = document.getElementById("deleteEventBtn");
  const saveEventBtn = document.getElementById("saveEventBtn");
  const eventModalTitle = document.getElementById("eventModalTitle");

  const closeEventModal = () => {
    eventModal?.classList.remove("active");
    editingScheduleId = null;
  };

  document.getElementById("addEventQuickBtn")?.addEventListener("click", () => {
    editingScheduleId = null;
    if (eventModalTitle) eventModalTitle.textContent = "새 일정 추가";
    if (saveEventBtn) saveEventBtn.textContent = "일정 등록";
    if (deleteEventBtn) deleteEventBtn.style.display = "none";

    document.getElementById("eventTitleInput").value = "";
    document.getElementById("eventStartTime").value = "14:00";
    document.getElementById("eventEndTime").value = "15:30";
    document.getElementById("eventCalendarType").value = "work";

    eventModal?.classList.add("active");
    lucide.createIcons();
  });

  document.getElementById("closeEventModal")?.addEventListener("click", closeEventModal);
  document.getElementById("cancelEventBtn")?.addEventListener("click", closeEventModal);

  // Save Event (Create or Update)
  saveEventBtn?.addEventListener("click", () => {
    const title = document.getElementById("eventTitleInput").value.trim();
    const startTime = document.getElementById("eventStartTime").value;
    const endTime = document.getElementById("eventEndTime").value;
    const type = document.getElementById("eventCalendarType").value;

    if (!title) {
      alert("일정 제목을 입력해 주세요.");
      return;
    }

    if (editingScheduleId) {
      // Update existing schedule
      const sched = appData.schedules.find(s => s.id === editingScheduleId);
      if (sched) {
        sched.title = title;
        sched.startTime = startTime;
        sched.endTime = endTime;
        sched.type = type;
        showToast(`'${title}' 일정이 수정되었습니다.`);
      }
    } else {
      // Create new schedule
      appData.schedules.push({
        id: "s_" + Date.now(),
        title: title,
        startTime: startTime,
        endTime: endTime,
        type: type
      });
      showToast("새 일정이 등록되었습니다.");
    }

    saveData();
    renderSchedules();
    closeEventModal();
  });

  // Delete Event
  deleteEventBtn?.addEventListener("click", () => {
    if (!editingScheduleId) return;
    const schedIndex = appData.schedules.findIndex(s => s.id === editingScheduleId);
    if (schedIndex === -1) return;

    const sched = appData.schedules[schedIndex];
    appData.schedules.splice(schedIndex, 1);
    saveData();
    renderSchedules();
    closeEventModal();
    showToast(`'${sched.title}' 일정이 삭제되었습니다.`);
  });
}

// Setup SortableJS for Drag and Drop Task Reordering (A1, A2, B1...)
function setupSortables() {
  const containers = ["taskListA", "taskListB", "taskListC"];

  containers.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const sortable = new Sortable(el, {
      group: "covey-tasks",
      animation: 200,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      handle: ".task-drag-handle", // Dedicated handle prevents accidental drags while scrolling
      touchStartThreshold: 3,
      onEnd: () => {
        syncTasksFromDOM();
      }
    });
    sortableInstances.push(sortable);
  });
}

// Sync State from DOM after Drag and Drop
function syncTasksFromDOM() {
  const newTasks = [];
  ["A", "B", "C"].forEach(priority => {
    const listEl = document.getElementById(`taskList${priority}`);
    if (!listEl) return;
    const cards = listEl.querySelectorAll(".task-card");
    cards.forEach(card => {
      const taskId = card.dataset.id;
      const originalTask = appData.tasks.find(t => t.id === taskId);
      if (originalTask) {
        originalTask.priority = priority;
        newTasks.push(originalTask);
      }
    });
  });

  appData.tasks = newTasks;
  saveData();
  renderTasks();
}

// Render Tasks (With Auto-assigned A1, A2, B1 numbers)
function renderTasks() {
  const listA = document.getElementById("taskListA");
  const listB = document.getElementById("taskListB");
  const listC = document.getElementById("taskListC");

  if (!listA || !listB || !listC) return;

  listA.innerHTML = "";
  listB.innerHTML = "";
  listC.innerHTML = "";

  const curDateStr = getCurViewDateStr();

  const groups = { A: [], B: [], C: [] };
  appData.tasks.forEach(task => {
    if (groups[task.priority]) groups[task.priority].push(task);
  });

  let pendingCount = 0;

  ["A", "B", "C"].forEach(p => {
    const items = groups[p];
    document.getElementById(`count${p}`).textContent = items.length;

    items.forEach((task, index) => {
      const isCompleted = isTaskCompletedOnDate(task, curDateStr);
      if (!isCompleted) pendingCount++;
      const code = `${p}${index + 1}`; // Auto code generation A1, A2, B1...
      
      const card = document.createElement("div");
      card.className = `task-card ${isCompleted ? "completed" : ""}`;
      card.dataset.id = task.id;
      card.dataset.priority = p;

      // Build Repeat Badge
      let repeatBadgeHtml = "";
      if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
        let label = "매일";
        if (task.recurrence.type === "weekdays") label = "평일";
        else if (task.recurrence.type === "custom") {
          label = task.recurrence.days && task.recurrence.days.length > 0 ? task.recurrence.days.join("·") : "특정 요일";
        }
        repeatBadgeHtml = `<span class="task-repeat-tag"><i data-lucide="repeat"></i> ${label}</span>`;
      }

      card.innerHTML = `
        <div class="task-drag-handle" title="끌어서 순서 변경">
          <i data-lucide="grip-vertical"></i>
        </div>
        <span class="task-code">${code}</span>
        <div class="task-checkbox" data-id="${task.id}" title="${isCompleted ? '완료 취소' : '완료 체크'}">
          <i data-lucide="check"></i>
        </div>
        <div class="task-content">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <div class="task-meta">
            ${task.role && task.role !== '일반' ? `<span class="task-role-tag">${escapeHtml(task.role)}</span>` : ''}
            ${repeatBadgeHtml}
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn btn-edit" data-id="${task.id}" title="업무 수정">
            <i data-lucide="edit-3"></i>
          </button>
          <button class="task-action-btn btn-forward" data-id="${task.id}" title="내일로 이관 (→)">
            <i data-lucide="arrow-right"></i>
          </button>
          <button class="task-action-btn btn-delete" data-id="${task.id}" title="업무 삭제">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;

      // Checkbox event
      const chk = card.querySelector(".task-checkbox");
      chk?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTaskComplete(task.id);
      });

      // Edit event
      const editBtn = card.querySelector(".btn-edit");
      editBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(task.id);
      });

      // Also allow clicking task title/content to edit
      const contentEl = card.querySelector(".task-content");
      contentEl?.addEventListener("click", () => {
        openEditModal(task.id);
      });

      // Forward event
      const fwd = card.querySelector(".btn-forward");
      fwd?.addEventListener("click", (e) => {
        e.stopPropagation();
        forwardTaskTomorrow(task.id);
      });

      // Delete event
      const del = card.querySelector(".btn-delete");
      del?.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      });

      // Swipe Gesture Support (Touch & Pointer)
      setupSwipeGesture(card, task.id);

      if (p === "A") listA.appendChild(card);
      if (p === "B") listB.appendChild(card);
      if (p === "C") listC.appendChild(card);
    });
  });

  const tabBadge = document.getElementById("taskPendingCount");
  if (tabBadge) tabBadge.textContent = pendingCount;

  lucide.createIcons();
}

// Swipe Gesture Handler for Task Cards (Optimized for smooth mobile scrolling)
function setupSwipeGesture(cardElement, taskId) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isHorizontalSwiping = false;
  let gestureDecided = false;

  cardElement.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    currentY = startY;
    isHorizontalSwiping = false;
    gestureDecided = false;
  }, { passive: true });

  cardElement.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1) return;
    currentX = e.touches[0].clientX;
    currentY = e.touches[0].clientY;

    const diffX = currentX - startX;
    const diffY = currentY - startY;

    // Decide gesture on first few pixels
    if (!gestureDecided) {
      if (Math.abs(diffY) > 8 && Math.abs(diffY) > Math.abs(diffX)) {
        // Vertical scroll intent: Do not intercept!
        gestureDecided = true;
        isHorizontalSwiping = false;
        return;
      } else if (Math.abs(diffX) > 12 && Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe intent: Activate swipe
        gestureDecided = true;
        isHorizontalSwiping = true;
      }
    }

    if (isHorizontalSwiping) {
      cardElement.style.transform = `translateX(${diffX * 0.7}px)`;
      if (diffX > 40) {
        cardElement.style.borderColor = "#10b981"; // Green for complete
      } else if (diffX < -40) {
        cardElement.style.borderColor = "#f59e0b"; // Orange for forward
      } else {
        cardElement.style.borderColor = "";
      }
    }
  }, { passive: true });

  cardElement.addEventListener("touchend", () => {
    if (!isHorizontalSwiping) {
      cardElement.style.transform = "";
      cardElement.style.borderColor = "";
      return;
    }

    const diffX = currentX - startX;
    cardElement.style.transform = "";
    cardElement.style.borderColor = "";
    isHorizontalSwiping = false;
    gestureDecided = false;

    if (diffX > 80) {
      // Right swipe: Complete
      toggleTaskComplete(taskId);
    } else if (diffX < -80) {
      // Left swipe: Forward to tomorrow
      forwardTaskTomorrow(taskId);
    }
  });

  cardElement.addEventListener("touchcancel", () => {
    cardElement.style.transform = "";
    cardElement.style.borderColor = "";
    isHorizontalSwiping = false;
    gestureDecided = false;
  });
}

function openEditModal(taskId) {
  const task = appData.tasks.find(t => t.id === taskId);
  if (!task) return;

  editingTaskId = taskId;
  editSelectedPriority = task.priority || "A";
  editSelectedRepeat = (task.recurrence && task.recurrence.type) ? task.recurrence.type : "none";
  editSelectedCustomDays = (task.recurrence && task.recurrence.days) ? [...task.recurrence.days] : [];

  // Populate Title
  const titleInput = document.getElementById("editTaskTitleInput");
  if (titleInput) titleInput.value = task.title;

  // Populate Role
  const roleSelect = document.getElementById("editTaskRoleSelect");
  if (roleSelect) roleSelect.value = task.role || "일반";

  // Priority Chips
  ["A", "B", "C"].forEach(p => {
    const chip = document.getElementById(`editPriority${p}`);
    if (chip) {
      if (p === editSelectedPriority) chip.classList.add("active");
      else chip.classList.remove("active");
    }
  });

  // Repeat Chips
  ["none", "daily", "weekdays", "custom"].forEach(r => {
    const cap = r.charAt(0).toUpperCase() + r.slice(1);
    const chip = document.getElementById(`editRepeat${cap}`);
    if (chip) {
      if (r === editSelectedRepeat) chip.classList.add("active");
      else chip.classList.remove("active");
    }
  });

  // Custom Days Picker
  const customDaysPicker = document.getElementById("editCustomDaysPicker");
  if (customDaysPicker) {
    customDaysPicker.style.display = (editSelectedRepeat === "custom") ? "flex" : "none";
    document.querySelectorAll(".edit-day-chip").forEach(chip => {
      const day = chip.dataset.day;
      if (editSelectedCustomDays.includes(day)) chip.classList.add("active");
      else chip.classList.remove("active");
    });
  }

  // Open Modal
  const modal = document.getElementById("editTaskModal");
  if (modal) {
    modal.classList.add("active");
    lucide.createIcons();
    setTimeout(() => titleInput?.focus(), 100);
  }
}

function toggleTaskComplete(taskId) {
  const task = appData.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (!Array.isArray(task.completedDates)) {
    task.completedDates = [];
  }

  const curDateStr = getCurViewDateStr();
  const isDone = isTaskCompletedOnDate(task, curDateStr);

  if (isDone) {
    task.completedDates = task.completedDates.filter(d => d !== curDateStr);
    task.completed = task.completedDates.length > 0;
    saveData();
    renderTasks();
    showToast("완료가 취소되었습니다.");
  } else {
    if (!task.completedDates.includes(curDateStr)) {
      task.completedDates.push(curDateStr);
    }
    task.completed = true;
    saveData();
    renderTasks();
    showToast(`우선업무가 완료(√)되었습니다! (${curDateStr} 에만 저장)`);
  }
}

function forwardTaskTomorrow(taskId) {
  const taskIndex = appData.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;
  const task = appData.tasks[taskIndex];
  appData.tasks.splice(taskIndex, 1);
  saveData();
  renderTasks();
  showToast(`'${task.title}' 업무가 내일로 이관(→)되었습니다.`);
}

function deleteTask(taskId) {
  const task = appData.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Check if it has recurrence rule
  const isRecurring = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

  if (isRecurring) {
    // Open Delete Choice Modal
    pendingDeleteTaskId = taskId;
    const modal = document.getElementById("deleteChoiceModal");
    const titleText = document.getElementById("deleteTaskTitleText");
    if (titleText) titleText.textContent = `"${task.title}"`;
    if (modal) {
      modal.classList.add("active");
      lucide.createIcons();
    }
  } else {
    // Non-recurring task: delete directly
    performDelete(taskId, "single");
  }
}

function performDelete(taskId, mode) {
  const taskIndex = appData.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;
  const task = appData.tasks[taskIndex];

  appData.tasks.splice(taskIndex, 1);
  saveData();
  renderTasks();

  if (mode === "today_only") {
    showToast(`'${task.title}' 오늘 목록에서만 삭제되었습니다. (향후 반복 유지)`);
  } else if (mode === "all_future") {
    showToast(`'${task.title}' 향후 모든 반복 일정이 삭제되었습니다.`);
  } else {
    showToast(`'${task.title}' 업무가 삭제되었습니다.`);
  }
}

// Render Timetable / Schedule
function renderSchedules() {
  const container = document.getElementById("timelineContainer");
  if (!container) return;

  // Clear except now indicator
  const nowIndicator = document.getElementById("nowIndicator");
  container.innerHTML = "";
  if (nowIndicator) container.appendChild(nowIndicator);

  const hours = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", 
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", 
    "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
  ];

  const year = currentViewDate.getFullYear();
  const month = String(currentViewDate.getMonth() + 1).padStart(2, "0");
  const date = String(currentViewDate.getDate()).padStart(2, "0");
  const curDateStr = `${year}-${month}-${date}`;
  const isToday = (curDateStr === TODAY_STR);

  // Only show sample default schedules for today (or schedules specifically matched to curDateStr)
  const activeSchedules = isToday ? appData.schedules : appData.schedules.filter(s => s.date === curDateStr);

  hours.forEach(hour => {
    const slot = document.createElement("div");
    slot.className = "time-slot-row";

    // Find events matching this hour
    const matchingEvents = activeSchedules.filter(s => s.startTime.startsWith(hour.substring(0, 2)));

    const slotContent = document.createElement("div");
    slotContent.className = "time-content";

    matchingEvents.forEach(ev => {
      let typeClass = "event-work";
      if (ev.type === "timeblock") typeClass = "event-timeblock";
      if (ev.type === "personal") typeClass = "event-personal";

      const evEl = document.createElement("div");
      evEl.className = `time-event-block ${typeClass}`;
      evEl.dataset.id = ev.id;
      evEl.title = "클릭하여 일정 수정 / 삭제";
      evEl.innerHTML = `
        <span>${escapeHtml(ev.title)}</span>
        <span style="font-size:0.68rem;opacity:0.8;">${ev.startTime} ~ ${ev.endTime}</span>
      `;

      evEl.addEventListener("click", () => {
        openEditEventModal(ev.id);
      });

      slotContent.appendChild(evEl);
    });

    slot.innerHTML = `<div class="time-label">${hour}</div>`;
    slot.appendChild(slotContent);

    container.appendChild(slot);
  });
}

function openEditEventModal(scheduleId) {
  const sched = appData.schedules.find(s => s.id === scheduleId);
  if (!sched) return;

  editingScheduleId = scheduleId;

  const eventModal = document.getElementById("eventModal");
  const eventModalTitle = document.getElementById("eventModalTitle");
  const saveEventBtn = document.getElementById("saveEventBtn");
  const deleteEventBtn = document.getElementById("deleteEventBtn");

  if (eventModalTitle) eventModalTitle.textContent = "일정 수정 / 삭제";
  if (saveEventBtn) saveEventBtn.textContent = "일정 수정 저장";
  if (deleteEventBtn) deleteEventBtn.style.display = "inline-flex";

  document.getElementById("eventTitleInput").value = sched.title;
  document.getElementById("eventStartTime").value = sched.startTime;
  document.getElementById("eventEndTime").value = sched.endTime;
  document.getElementById("eventCalendarType").value = sched.type || "work";

  if (eventModal) {
    eventModal.classList.add("active");
    lucide.createIcons();
    setTimeout(() => document.getElementById("eventTitleInput")?.focus(), 100);
  }
}

// Render Daily Journals
function renderJournals() {
  const feed = document.getElementById("journalFeed");
  if (!feed) return;

  feed.innerHTML = "";

  const tagLabels = {
    memo: "📌 메모",
    meeting: "🤝 미팅",
    idea: "💡 아이디어",
    reflection: "✨ 감사/회고"
  };

  const year = currentViewDate.getFullYear();
  const month = String(currentViewDate.getMonth() + 1).padStart(2, "0");
  const date = String(currentViewDate.getDate()).padStart(2, "0");
  const curDateStr = `${year}-${month}-${date}`;
  const isToday = (curDateStr === TODAY_STR);

  const activeJournals = isToday ? appData.journals : appData.journals.filter(j => j.date === curDateStr);

  if (activeJournals.length === 0) {
    feed.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.8rem;">
        <i data-lucide="book-open" style="width:24px;height:24px;margin-bottom:6px;opacity:0.5;"></i>
        <p>이 날짜에 작성된 기록이 없습니다.<br>새로운 메모나 회고를 남겨보세요.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  activeJournals.forEach(item => {
    const card = document.createElement("div");
    card.className = "journal-card";
    card.innerHTML = `
      <div class="journal-card-header">
        <div class="journal-meta-left">
          <span class="journal-time">${item.time}</span>
          <span class="journal-category-badge">${tagLabels[item.tag] || item.tag}</span>
        </div>
        <div class="journal-actions">
          <button class="j-action-btn btn-j-edit" data-id="${item.id}" title="기록 수정">
            <i data-lucide="edit-3"></i>
          </button>
          <button class="j-action-btn btn-j-delete" data-id="${item.id}" title="기록 삭제">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
      <div class="journal-body">${escapeHtml(item.content)}</div>
    `;

    // Edit button event
    card.querySelector(".btn-j-edit")?.addEventListener("click", () => {
      openEditJournalModal(item.id);
    });

    // Delete button event
    card.querySelector(".btn-j-delete")?.addEventListener("click", () => {
      deleteJournal(item.id);
    });

    feed.appendChild(card);
  });

  lucide.createIcons();
}

function openEditJournalModal(journalId) {
  const journal = appData.journals.find(j => j.id === journalId);
  if (!journal) return;

  editingJournalId = journalId;
  editJournalSelectedTag = journal.tag || "memo";

  const timeInput = document.getElementById("editJournalTimeInput");
  const contentInput = document.getElementById("editJournalContentInput");

  if (timeInput) timeInput.value = journal.time;
  if (contentInput) contentInput.value = journal.content;

  // Set active tag chip
  document.querySelectorAll(".edit-j-tag").forEach(chip => {
    if (chip.dataset.tag === editJournalSelectedTag) chip.classList.add("active");
    else chip.classList.remove("active");
  });

  const modal = document.getElementById("editJournalModal");
  if (modal) {
    modal.classList.add("active");
    lucide.createIcons();
    setTimeout(() => contentInput?.focus(), 100);
  }
}

function deleteJournal(journalId) {
  const journalIndex = appData.journals.findIndex(j => j.id === journalId);
  if (journalIndex === -1) return;

  appData.journals.splice(journalIndex, 1);
  saveData();
  renderJournals();
  showToast("기록이 삭제되었습니다.");
}

// Render Weekly Compass
function renderCompass() {
  const list = document.getElementById("compassRolesList");
  if (!list) return;

  list.innerHTML = "";
  let totalRocks = 0;

  appData.compassRoles.forEach(roleObj => {
    const roleCard = document.createElement("div");
    roleCard.className = "role-card";

    let rocksHtml = "";
    roleObj.rocks.forEach(rock => {
      totalRocks++;
      rocksHtml += `
        <div class="big-rock-item">
          <span class="rock-text">${escapeHtml(rock.text)}</span>
          ${rock.assignedToday ? 
            `<span style="font-size:0.68rem;color:#10b981;font-weight:700;">오늘 등록됨</span>` : 
            `<button class="send-to-today-btn" data-id="${rock.id}" data-text="${escapeHtml(rock.text)}" data-role="${escapeHtml(roleObj.role)}">오늘 할 일로 +</button>`
          }
        </div>
      `;
    });

    roleCard.innerHTML = `
      <div class="role-header">
        <span class="role-name">${escapeHtml(roleObj.role)}</span>
      </div>
      <div class="big-rocks-list">
        ${rocksHtml || '<span style="font-size:0.75rem;color:var(--text-muted);">등록된 핵심 과제가 없습니다.</span>'}
      </div>
    `;

    // Assign to today button event
    roleCard.querySelectorAll(".send-to-today-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const text = btn.dataset.text;
        const role = btn.dataset.role;
        const rockId = btn.dataset.id;

        // Add as Priority A task
        appData.tasks.unshift({
          id: "t_" + Date.now(),
          title: `[Big Rock] ${text}`,
          priority: "A",
          completed: false,
          completedDates: [],
          role: role
        });

        // Mark rock as assigned
        const r = roleObj.rocks.find(item => item.id === rockId);
        if (r) r.assignedToday = true;

        saveData();
        renderTasks();
        renderCompass();
        showToast("컴파스의 Big Rock이 오늘의 A 우선업무로 추가되었습니다!");
      });
    });

    list.appendChild(roleCard);
  });

  const badge = document.getElementById("compassCountBadge");
  if (badge) badge.textContent = totalRocks;
}

// Render Monthly Google Calendar (Pure Google Calendar Events Only)
function renderMonthlyGoogleCalendar() {
  const label = document.getElementById("currentMonthYearLabel");
  if (label) {
    label.textContent = `${calCurrentYear}년 ${calCurrentMonth + 1}월`;
  }

  const matrix = document.getElementById("calendarDaysMatrix");
  if (!matrix) return;
  matrix.innerHTML = "";

  const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(calCurrentYear, calCurrentMonth, 0).getDate();

  const todayStr = TODAY_STR;

  // Previous month overflow days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const cell = document.createElement("div");
    cell.className = "cal-day-cell other-month";
    cell.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
    matrix.appendChild(cell);
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dayStr = `${calCurrentYear}-${String(calCurrentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(calCurrentYear, calCurrentMonth, d).getDay();

    const cell = document.createElement("div");
    let cellClasses = ["cal-day-cell"];
    if (dayOfWeek === 0) cellClasses.push("is-sun");
    if (dayOfWeek === 6) cellClasses.push("is-sat");
    if (dayStr === todayStr) cellClasses.push("today");
    if (dayStr === calSelectedDateStr) cellClasses.push("selected");

    cell.className = cellClasses.join(" ");

    // Check Google Calendar Events on this date (Strictly Google Calendar only)
    const matchingGcalEvents = GOOGLE_CALENDAR_EVENTS.filter(e => e.date === dayStr);

    let dotsHtml = "";
    if (matchingGcalEvents.length > 0) {
      dotsHtml = `<div class="gcal-dots-row">`;
      matchingGcalEvents.forEach(() => {
        dotsHtml += `<span class="gcal-event-dot"></span>`;
      });
      dotsHtml += `</div>`;
    }

    cell.innerHTML = `
      <span class="cal-day-num">${d}</span>
      ${dotsHtml}
    `;

    cell.addEventListener("click", () => {
      calSelectedDateStr = dayStr;
      currentViewDate = new Date(calCurrentYear, calCurrentMonth, d);
      updateDateDisplay();
      renderSelectedDateGoogleEvents();
    });

    matrix.appendChild(cell);
  }

  renderSelectedDateGoogleEvents();
}

// Render Selected Date's Google Events
function renderSelectedDateGoogleEvents() {
  const titleEl = document.getElementById("selectedDateEventsTitle");
  const countEl = document.getElementById("selectedDateEventsCount");
  const listEl = document.getElementById("selectedDateEventsList");

  if (!titleEl || !countEl || !listEl) return;

  const dateParts = calSelectedDateStr.split("-");
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);
  
  const dObj = new Date(calSelectedDateStr);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayName = dayNames[dObj.getDay()];

  titleEl.textContent = `${month}월 ${day}일 (${dayName}) 구글 일정`;

  const matchingEvents = GOOGLE_CALENDAR_EVENTS.filter(e => e.date === calSelectedDateStr);
  countEl.textContent = `${matchingEvents.length}개 일정`;

  listEl.innerHTML = "";
  if (matchingEvents.length === 0) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:0.75rem;">
        <i data-lucide="calendar" style="width:20px;height:20px;margin-bottom:4px;opacity:0.6;"></i>
        <p>이 날짜에 등록된 구글 캘린더 일정이 없습니다.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  matchingEvents.forEach(ev => {
    const item = document.createElement("div");
    item.className = "gcal-event-item";
    item.innerHTML = `
      <span class="gcal-event-time">${escapeHtml(ev.time)}</span>
      <span class="gcal-event-title">${escapeHtml(ev.title)}</span>
      <span class="gcal-tag">${escapeHtml(ev.location)}</span>
    `;
    listEl.appendChild(item);
  });
}

// Update Date Display and Components
function updateDateDisplay() {
  const displayDay = document.getElementById("displayDay");
  const displayFullDate = document.getElementById("displayFullDate");

  if (!displayDay || !displayFullDate) return;

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth() + 1;
  const date = currentViewDate.getDate();
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayName = dayNames[currentViewDate.getDay()];

  // Calculate Difference with Real Today
  const viewMidnight = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), currentViewDate.getDate());
  const todayMidnight = new Date(TODAY_BASE_DATE.getFullYear(), TODAY_BASE_DATE.getMonth(), TODAY_BASE_DATE.getDate());
  const dayDiff = Math.round((viewMidnight - todayMidnight) / (1000 * 3600 * 24));

  let dayLabel = "Today";
  if (dayDiff === 0) dayLabel = "Today";
  else if (dayDiff === -1) dayLabel = "Yesterday";
  else if (dayDiff === 1) dayLabel = "Tomorrow";
  else if (dayDiff < 0) dayLabel = `${dayName}요일 (D${dayDiff})`;
  else dayLabel = `${dayName}요일 (D+${dayDiff})`;

  displayDay.textContent = dayLabel;
  displayFullDate.textContent = `${year}. ${String(month).padStart(2, "0")}. ${String(date).padStart(2, "0")} (${dayName})`;

  // Sync calendar selected date
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  calSelectedDateStr = dateStr;
  calCurrentYear = year;
  calCurrentMonth = month - 1;

  renderMonthlyGoogleCalendar();
  renderSchedules();
  renderTasks();
  renderJournals();
}

// Render All Components
function renderAll() {
  updateDateDisplay();
  renderCompass();
}

// Toast Notification Helper
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("appToast");
  const msgEl = document.getElementById("toastMessage");
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.add("active");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

// Safe HTML Escaping
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
