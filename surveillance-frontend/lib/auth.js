export const saveAuth = (accessToken, role, matricule) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('user_role', role);
  localStorage.setItem('user_matricule', matricule);
};

export const saveTempToken = (tempToken) => {
  localStorage.setItem('temp_token', tempToken);
};

export const getTempToken = () => {
  return localStorage.getItem('temp_token');
};

export const getAuth = () => {
  return {
    token: localStorage.getItem('access_token'),
    role: localStorage.getItem('user_role'),
    matricule: localStorage.getItem('user_matricule'),
  };
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

export const isAdmin = () => {
  return localStorage.getItem('user_role') === 'admin';
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('temp_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_matricule');
};