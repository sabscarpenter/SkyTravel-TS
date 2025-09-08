import { pool } from '../db';
import { Router, Request, Response } from 'express';
import { parseISO, addMinutes, addHours, differenceInMinutes } from 'date-fns';