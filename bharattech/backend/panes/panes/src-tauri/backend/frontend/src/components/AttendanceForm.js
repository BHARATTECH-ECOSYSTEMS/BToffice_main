import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';
import axios from 'axios';

const AttendanceForm = () => {
  const [employeeId, setEmployeeId] = useState('');
  [checkInStatus, setCheckInStatus] = useState(null);
  [checkOutStatus, setCheckOutStatus] = useState(null);
  [error, setError] = useState('');

  const handleCheckIn = async () => {
    try {
      setError('');
      const response = await axios.post('/api/attendance/checkin', { employeeId });
      setCheckInStatus('success');
      setCheckOutStatus(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error checking in');
      setCheckInStatus('error');
    }
  };

  const handleCheckOut = async () => {
    try {
      setError('');
      const response = await axios.post('/api/attendance/checkout', { employeeId });
      setCheckOutStatus('success');
      setCheckInStatus(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error checking out');
      setCheckOutStatus('error');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Check In/Out
      </Typography>

      <TextField
        label="Employee ID"
        variant="outlined"
        fullWidth
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCheckIn}
          disabled={!employeeId}
        >
          Check In
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleCheckOut}
          disabled={!employeeId}
        >
          Check Out
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {checkInStatus === 'success' && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Successfully checked in!
        </Alert>
      )}

      {checkOutStatus === 'success' && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Successfully checked out!
        </Alert>
      )}
    </Container>
  );
};

export default AttendanceForm;