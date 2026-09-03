import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

import axios from 'axios';
import { Box, TextField } from '@mui/material';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async(e) => {
    e.preventDefault();
    try{
    const res = await axios.post("http://localhost:5000/api/auth/login",{email,password})
    localStorage.setItem("myId",res.data.user.id)
     localStorage.setItem("token",res.data.token)
    console.log('Login attempt:', { email, password });
    navigate("/courses")
    
    }
    catch(err){
      alert("Something error happened")
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{height:"100%",width:"100%", display:"flex", justifyContent:"center", alignItems:"center", backgroundColor:"white"}}>
      <Box display={"flex"} justifyContent={"center"} alignItems={"center"} bgcolor={""} flexDirection={"column"} padding={3} gap={3}>
<TextField value={email} onChange={(e)=>setEmail(e.target.value)} placeholder='email'/>
  <TextField value={password} onChange={(e)=>setPassword(e.target.value)} placeholder='password'/>
    <Button>Login</Button>
      </Box>
    </form>
  );
};

export default Login;