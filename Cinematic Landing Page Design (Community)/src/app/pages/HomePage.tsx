import React from 'react';
import { Hero } from '../components/Hero';
import { Problems } from '../components/Problems';
import { Capabilities } from '../components/Capabilities';
import { Architecture } from '../components/Architecture';
import { GlobalNetwork } from '../components/GlobalNetwork';
import { Builders } from '../components/Builders';
import { EditorialCards } from '../components/EditorialCards';

export const HomePage = () => (
  <>
    <Hero />
    <Problems />
    <Capabilities />
    <Architecture />
    <GlobalNetwork />
    <Builders />
    <EditorialCards />
  </>
);
