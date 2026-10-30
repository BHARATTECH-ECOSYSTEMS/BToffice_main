import React, { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, Grid, Box } from '@mui/material';
import axios from 'axios';
import moment from 'moment';

const Dashboard = () => {
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
        const response = await axios.get('/api/attendance');
        setTodayAttendance(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching attendance:', error);
        setLoading(false);
      }
    };

    fetchTodayAttendance();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Today's Attendance ({moment().format('MMMM Do YYYY')})
      </Typography>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Grid container spacing={3}>
          {todayAttendance.map((record) => (
            <Grid item xs={12} sm={6} md={4} key={record._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Employee ID: {record.employeeId}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Typography color="text.secondary">Check In:</Typography>
                    <Typography>{moment(record.checkIn).format('hh:mm A')}</Typography>
                  </Box>
                  {record.checkOut && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography color="text.secondary">Check Out:</Typography>
                      <Typography>{moment(record.checkOut).format('hh:mm A')}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Typography color="text.secondary">Status:</Typography>
                    <Typography color={getStatusColor(record.status)}>
                      {record.status}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Dashboard;