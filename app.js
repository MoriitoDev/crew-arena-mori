(function () {
  "use strict";

  const STORAGE_KEY = "todo-tasks-v1";

  const form = document.getElementById("task-form");
  const input = document.getElementById("task-input");
  const list = document.getElementById("task-list");
  const emptyMsg = document.getElementById("empty-msg");
  const counter = document.getElementById("counter");
  const clearDoneBtn = document.getElementById("clear-done");

  let tasks = load();

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function render() {
    list.innerHTML = "";

    tasks.forEach(function (task) {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.addEventListener("change", function () {
        task.done = checkbox.checked;
        save();
        render();
      });

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-btn";
      del.textContent = "Eliminar";
      del.addEventListener("click", function () {
        tasks = tasks.filter(function (t) { return t.id !== task.id; });
        save();
        render();
      });

      li.append(checkbox, text, del);
      list.appendChild(li);
    });

    emptyMsg.hidden = tasks.length > 0;

    const pending = tasks.filter(function (t) { return !t.done; }).length;
    counter.textContent = pending + " pendiente" + (pending === 1 ? "" : "s") +
      " de " + tasks.length;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    tasks.push({ id: createId(), text: text, done: false });
    input.value = "";
    save();
    render();
    input.focus();
  });

  clearDoneBtn.addEventListener("click", function () {
    tasks = tasks.filter(function (t) { return !t.done; });
    save();
    render();
  });

  render();
})();
