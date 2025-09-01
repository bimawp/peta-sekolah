import React, { useState } from "react";
import styles from "./ProfileForm.module.css";
import Button from "../../ui/Button/Button";
import Input from "../../ui/Input/Input";

const ProfileForm = ({ initialData = {}, onSave }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    email: initialData.email || "",
    role: initialData.role || "Admin",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(formData);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>Edit Profil Admin</h2>

      <div className={styles.field}>
        <label htmlFor="name">Nama</label>
        <Input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="Masukkan nama"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Masukkan email"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="role">Role</label>
        <Input
          id="role"
          name="role"
          type="text"
          value={formData.role}
          disabled
        />
      </div>

      <Button type="submit">Simpan Perubahan</Button>
    </form>
  );
};

export default ProfileForm;
