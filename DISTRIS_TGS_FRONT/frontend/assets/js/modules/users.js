import { userApi } from "../api.js";

export function setupUsersModule() {
  const tbody = document.getElementById("users-tbody");
  const msg = document.getElementById("users-message");
  const form = document.getElementById("user-form");
  const title = document.getElementById("user-form-title");
  const cancelBtn = document.getElementById("user-cancel-btn");

  const idInput = document.getElementById("user-id");
  const emailInput = document.getElementById("user-email");
  const nameInput = document.getElementById("user-name");
  const roleSelect = document.getElementById("user-role");
  const passInput = document.getElementById("user-password");
  const pass2Input = document.getElementById("user-password2");

  function resetForm() {
    idInput.value = "";
    emailInput.value = "";
    nameInput.value = "";
    roleSelect.value = "admin";
    passInput.value = "";
    pass2Input.value = "";
    title.textContent = "Crear usuario";
    msg.textContent = "";
  }

  async function loadUsers() {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-message">Cargando usuarios...</td></tr>';
    msg.textContent = "";
    try {
      const users = await userApi.list();
      if (!users.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="empty-message">No hay usuarios.</td></tr>';
        return;
      }
      tbody.innerHTML = "";
      for (const u of users) {
        const tr = document.createElement("tr");
        const created = u.createdAt
          ? new Date(u.createdAt).toLocaleString()
          : "";
        tr.innerHTML = `
          <td>${u.id}</td>
          <td>${u.email}</td>
          <td>${u.name || ""}</td>
          <td>${u.role}</td>
          <td>${created}</td>
          <td>
            <button class="btn btn-outline btn-sm" data-action="edit">Editar</button>
            <button class="btn btn-ghost btn-sm" data-action="delete">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);

        const [editBtn, delBtn] = tr.querySelectorAll("button");

        editBtn.addEventListener("click", () => {
          idInput.value = u.id;
          emailInput.value = u.email;
          nameInput.value = u.name || "";
          roleSelect.value = u.role;
          passInput.value = "";
          pass2Input.value = "";
          title.textContent = `Editar usuario #${u.id}`;
          msg.textContent = "";
        });

        delBtn.addEventListener("click", async () => {
          if (!confirm(`¿Eliminar al usuario ${u.email}?`)) return;
          try {
            await userApi.remove(u.id);
            if (idInput.value && Number(idInput.value) === u.id) {
              resetForm();
            }
            await loadUsers();
          } catch (err) {
            msg.textContent = err.message || "Error al eliminar usuario.";
          }
        });
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-message">Error: ${err.message}</td></tr>`;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const id = idInput.value ? Number(idInput.value) : null;
    const email = emailInput.value.trim();
    const name = nameInput.value.trim();
    const role = roleSelect.value;
    const pass = passInput.value;
    const pass2 = pass2Input.value;

    if (!email) {
      msg.textContent = "El email es obligatorio.";
      return;
    }
    if (!id && !pass) {
      msg.textContent = "Para crear un usuario nuevo, la contraseña es obligatoria.";
      return;
    }
    if ((pass || pass2) && pass !== pass2) {
      msg.textContent = "Las contraseñas no coinciden.";
      return;
    }

    const payload = {
      email,
      name: name || null,
      role,
    };
    if (pass) payload.password = pass;

    try {
      if (id) {
        await userApi.update(id, payload);
      } else {
        await userApi.create(payload);
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      msg.textContent = err.message || "Error guardando usuario.";
    }
  });

  cancelBtn.addEventListener("click", resetForm);

  // carga inicial
  loadUsers();
}
