import tinycolor from 'tinycolor2';
import uPlot, { Series } from 'uplot';
import { getCanvasContext } from '../../../utils/measureText';
import {
  DrawStyle,
  LineConfig,
  AreaConfig,
  PointsConfig,
  PointVisibility,
  LineInterpolation,
  AreaGradientMode,
} from '../config';
import { PlotConfigBuilder } from '../types';

const pathBuilders = uPlot.paths;

const barWidthFactor = 0.6;
const barMaxWidth = Infinity;

const barsBuilder = pathBuilders.bars!({ size: [barWidthFactor, barMaxWidth] });
const linearBuilder = pathBuilders.linear!();
const smoothBuilder = pathBuilders.spline!();
const stepBeforeBuilder = pathBuilders.stepped!({ align: -1 });
const stepAfterBuilder = pathBuilders.stepped!({ align: 1 });

export interface SeriesProps extends LineConfig, AreaConfig, PointsConfig {
  drawStyle: DrawStyle;
  scaleKey: string;
  height: number;
}

export class UPlotSeriesBuilder extends PlotConfigBuilder<SeriesProps, Series> {
  getConfig() {
    const {
      drawStyle,
      lineInterpolation,
      lineColor,
      lineWidth,
      showPoints,
      pointColor,
      pointSize,
      fillColor,
      fillOpacity,
      fillGradient,
      scaleKey,
      spanNulls,
      height,
    } = this.props;

    let lineConfig: Partial<Series> = {};

    if (drawStyle === DrawStyle.Points) {
      lineConfig.paths = () => null;
    } else {
      lineConfig.stroke = lineColor;
      lineConfig.width = lineWidth;
      lineConfig.paths = (self: uPlot, seriesIdx: number, idx0: number, idx1: number) => {
        let pathsBuilder = linearBuilder;

        if (drawStyle === DrawStyle.Bars) {
          pathsBuilder = barsBuilder;
        } else if (drawStyle === DrawStyle.Line) {
          if (lineInterpolation === LineInterpolation.StepBefore) {
            pathsBuilder = stepBeforeBuilder;
          } else if (lineInterpolation === LineInterpolation.StepAfter) {
            pathsBuilder = stepAfterBuilder;
          } else if (lineInterpolation === LineInterpolation.Smooth) {
            pathsBuilder = smoothBuilder;
          }
        }

        return pathsBuilder(self, seriesIdx, idx0, idx1);
      };
    }

    const pointsConfig: Partial<Series> = {
      points: {
        stroke: pointColor,
        fill: pointColor,
        size: pointSize,
      },
    };

    // we cannot set points.show property above (even to undefined) as that will clear uPlot's default auto behavior
    if (showPoints === PointVisibility.Auto) {
      if (drawStyle === DrawStyle.Bars) {
        pointsConfig.points!.show = false;
      }
    } else if (showPoints === PointVisibility.Never) {
      pointsConfig.points!.show = false;
    } else if (showPoints === PointVisibility.Always) {
      pointsConfig.points!.show = true;
    }

    let fillConfig: any | undefined;
    let fillOpacityNumber = fillOpacity ?? 0;

    if (fillColor && fillOpacityNumber > 0) {
      fillConfig = {
        fill: fillOpacity
          ? tinycolor(fillColor)
              .setAlpha(fillOpacity)
              .toRgbString()
          : fillColor,
      };

      if (fillGradient && fillGradient !== AreaGradientMode.None) {
        fillConfig.fill = getCanvasGradient(fillColor, fillGradient, fillOpacityNumber, height);
      }
    }

    return {
      scale: scaleKey,
      spanGaps: spanNulls,
      ...lineConfig,
      ...pointsConfig,
      ...fillConfig,
    };
  }
}

function getCanvasGradient(
  color: string,
  gradientMode: AreaGradientMode,
  opacity: number,
  plotHeight: number
): CanvasGradient {
  const ctx = getCanvasContext();
  const pxRatio = window.devicePixelRatio ?? 1;
  const pixelHeight = (plotHeight - 30) * pxRatio;
  const gradient = ctx.createLinearGradient(0, 0, 0, pixelHeight);

  switch (gradientMode) {
    case AreaGradientMode.Hue:
      const color1 = tinycolor(color)
        .spin(-25)
        .darken(30)
        .setAlpha(opacity)
        .toRgbString();
      const color2 = tinycolor(color)
        .spin(25)
        .lighten(35)
        .setAlpha(opacity)
        .toRgbString();
      gradient.addColorStop(0, color2);
      gradient.addColorStop(1, color1);

    case AreaGradientMode.Opacity:
    default:
      gradient.addColorStop(
        0,
        tinycolor(color)
          .setAlpha(opacity)
          .toRgbString()
      );
      gradient.addColorStop(
        1,
        tinycolor(color)
          .setAlpha(0)
          .toRgbString()
      );
      return gradient;
  }
}
