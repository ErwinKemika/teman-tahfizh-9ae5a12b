"use client";

import React from "react";
import {
  AreaChart,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LinearYAxis,
  LinearYAxisTickSeries,
  AreaSeries,
  Area,
  Gradient,
  GradientStop,
  GridlineSeries,
  Gridline,
} from "reaviz";

export interface AreaProgressDataPoint {
  key: Date;
  data: number;
}

interface AreaChartProgressProps {
  data: AreaProgressDataPoint[];
  height?: number;
  color?: string;
}

export function AreaChartProgress({
  data,
  height = 160,
  color = "#F4C430",
}: AreaChartProgressProps) {
  if (data.every((d) => d.data === 0)) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Belum ada data
      </div>
    );
  }

  return (
    <AreaChart
      height={height}
      data={data}
      xAxis={
        <LinearXAxis
          type="time"
          tickSeries={
            <LinearXAxisTickSeries
              label={
                <LinearXAxisTickLabel
                  format={(v) =>
                    new Date(v).toLocaleDateString("id-ID", {
                      month: "short",
                      year: "2-digit",
                    })
                  }
                  fill="hsl(var(--muted-foreground) / 0.8)"
                />
              }
              tickSize={10}
            />
          }
        />
      }
      yAxis={
        <LinearYAxis
          axisLine={null}
          tickSeries={<LinearYAxisTickSeries line={null} label={null} tickSize={10} />}
        />
      }
      series={
        <AreaSeries
          interpolation="smooth"
          colorScheme={[color]}
          area={
            <Area
              gradient={
                <Gradient
                  stops={[
                    <GradientStop key={1} stopOpacity={0} />,
                    <GradientStop key={2} offset="100%" stopOpacity={0.35} />,
                  ]}
                />
              }
            />
          }
        />
      }
      gridlines={
        <GridlineSeries
          line={<Gridline strokeColor="hsl(var(--border) / 0.5)" />}
        />
      }
    />
  );
}
