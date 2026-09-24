import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ResearchQuery {
  query: string;
  industry?: string;
  location?: string;
}

export interface ResearchResultData {
  businessName: string;
  website?: string;
  industry?: string;
  location?: string;
  source: string;
  sourceUrl?: string;
  contactInfo?: any[];
  qualificationHypothesis?: string;
  confidence: number;
  evidence?: any;
}

export interface ResearchProvider {
  search(query: ResearchQuery): Promise<ResearchResultData[]>;
}
