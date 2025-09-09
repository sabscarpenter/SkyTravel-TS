import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, shareReplay, switchMap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';