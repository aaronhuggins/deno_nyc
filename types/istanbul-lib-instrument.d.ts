import { FileCoverage, FileCoverageData } from 'https://unpkg.com/@types/istanbul-lib-coverage@2.0.3/index.d.ts';
import * as babelTypes from 'https://unpkg.com/@types/babel-types@7.0.9/ts3.6/index.d.ts';

interface RawSourceMap {
  version: number;
  sources: string[];
  names: string[];
  sourceRoot?: string;
  sourcesContent?: string[];
  mappings: string;
  file: string;
}

export interface InstrumenterOptions {
    coverageVariable: string;
    preserveComments: boolean;
    compact: boolean;
    esModules: boolean;
    autoWrap: boolean;
    produceSourceMap: boolean;
    sourceMapUrlCallback(filename: string, url: string): void;
    debug: boolean;
}

export type InstrumenterCallback = (error: Error | null, code: string) => void;

export class Instrumenter {
    fileCoverage: FileCoverage;
    sourceMap: RawSourceMap | null;
    opts: InstrumenterOptions;

    constructor(options?: Partial<InstrumenterOptions>);

    normalizeOpts(options?: Partial<InstrumenterOptions>): InstrumenterOptions;

    instrumentSync(
        code: string,
        filename: string,
        inputSourceMap?: RawSourceMap
    ): string;

    instrument(
        code: string,
        filenameOrCallback: string | InstrumenterCallback,
        callback?: InstrumenterCallback,
        inputSourceMap?: RawSourceMap
    ): void;

    lastFileCoverage(): FileCoverageData;
    lastSourceMap(): RawSourceMap;
}

export function createInstrumenter(
    options?: Partial<InstrumenterOptions>
): Instrumenter;

export interface InitialCoverage {
    path: string;
    hash: string;
    gcv: any;
    coverageData: any;
}

export function readInitialCoverage(code: string): InitialCoverage;

export interface Visitor {
    enter(path: string): void;
    exit(path: string): { fileCoverage: FileCoverage; sourceMappingURL: string };
}

export interface VisitorOptions {
    coverageVariable: string;
    inputSourceMap: RawSourceMap;
}

export function programVisitor(
    types: typeof babelTypes,
    sourceFilePath?: string,
    opts?: Partial<VisitorOptions>
): Visitor;
