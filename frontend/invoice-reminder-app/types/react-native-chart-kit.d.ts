declare module 'react-native-chart-kit' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface ChartData {
      labels: string[];
      datasets: Array<{
          data: number[];
          color?: (opacity: number) => string;
          strokeWidth?: number;
      }>;
  }

  export interface ChartConfig {
      backgroundColor?: string;
      backgroundGradientFrom?: string;
      backgroundGradientTo?: string;
      decimalPlaces?: number;
      color: (opacity: number) => string;
      labelColor?: (opacity: number) => string;
      style?: ViewStyle;
      propsForDots?: object;
      propsForBackgroundLines?: object;
      barPercentage?: number;
  }

  export class LineChart extends Component<{
      data: ChartData;
      width: number;
      height: number;
      chartConfig: ChartConfig;
      yAxisLabel?: string;
      yAxisSuffix?: string;
      fromZero?: boolean;
      bezier?: boolean;
      style?: ViewStyle;
      verticalLabelRotation?: number;
      horizontalLabelRotation?: number;
  }> {}

  export class BarChart extends Component<{
      data: ChartData;
      width: number;
      height: number;
      chartConfig: ChartConfig;
      yAxisLabel?: string;
      fromZero?: boolean;
      withInnerLines?: boolean;
      showValuesOnTopOfBars?: boolean;
      verticalLabelRotation?: number;
      formatXLabel?: (label: string, index: number) => string;
  }> {}
}
