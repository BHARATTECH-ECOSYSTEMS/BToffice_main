import React, { useState, useEffect } from 'react';
import { Container, Typography, TextField, Button, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import axios from 'axios';
import moment from 'moment';

const AttendanceList = () => {
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/attendance', { params: { date } });
      setAttendance(response.data);
    } catch (err) {
      setError('Error fetching attendance records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleDateChange = (e) => {
    setDate(e.target.value);
  };

  const handleSearch = () => {
    fetchAttendance();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Attendance Records
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={handleDateChange}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 200 }}
        />
        <Button variant="contained" onClick={handleSearch}>
          Search
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : attendance.length === 0 ? (
        <Typography>No attendance records found for this date</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record._id}>
                  <TableCell>{record.employeeId}</TableCell>
                  <TableCell>{moment(record.checkIn).format('hh:mm A')}</TableCell>
                  <TableCell>{
                    record.checkOut ? moment(record.checkOut).format('hh:mm A') : 'Not checked out'
                  }</TableCell>
                  <TableCell>{
                    record.checkOut ? moment.duration(moment(record.checkOut).diff(moment(record.checkIn))).humanize() : 'N/A'
                  }</TableCell>
                  <TableCell>{record.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default AttendanceList;