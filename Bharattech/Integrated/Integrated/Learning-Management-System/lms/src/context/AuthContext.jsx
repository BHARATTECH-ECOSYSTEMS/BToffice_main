import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const myId = localStorage.getItem("myId");
  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!myId || !token) {
          setLoading(false);
          return;
        }

        const res = await axios.get(
          `http://localhost:5000/api/auth/${myId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUser(res.data.user);
      } catch (err) {
        console.error("Auth fetch failed:", err);
        logout(); 
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [myId, token]); 

 
  const logout = () => {
    localStorage.removeItem("myId");
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};



