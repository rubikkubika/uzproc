declare module 'react-chartjs-2' {
  import { Component } from 'react';
  import { ChartData, ChartOptions } from 'chart.js';

  export interface ChartComponentProps {
    data: ChartData;
    options?: ChartOptions;
    redraw?: boolean;
    getDatasetAtEvent?: (dataset: any) => void;
    getElementAtEvent?: (element: any) => void;
    getElementsAtEvent?: (elements: any) => void;
  }

  export interface ChartProps extends ChartComponentProps {
    type: 'line' | 'bar' | 'radar' | 'doughnut' | 'polarArea' | 'bubble' | 'pie' | 'scatter';
  }

  export class Chart extends Component<ChartProps> {}
  export class Line extends Component<ChartComponentProps> {}
  export class Bar extends Component<ChartComponentProps> {}
  export class Pie extends Component<ChartComponentProps> {}
  export class Doughnut extends Component<ChartComponentProps> {}
  export class Radar extends Component<ChartComponentProps> {}
  export class PolarArea extends Component<ChartComponentProps> {}
  export class Bubble extends Component<ChartComponentProps> {}
  export class Scatter extends Component<ChartComponentProps> {}
}

