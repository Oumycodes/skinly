import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/types';
import type { SkinCondition } from '../../services/scan';
import type { ScanAngle } from '../../utils/skinMeasures';
import { LatestScanPanel } from '../scan/LatestScanPanel';

interface FaceAnalysisPanelProps {
  imageUrls: Partial<Record<ScanAngle, string>>;
  overallScore: number;
  summary: string;
  conditions: SkinCondition[];
  onScanPress?: () => void;
  onZoomChange?: (zoomed: boolean) => void;
}

export function FaceAnalysisPanel({
  imageUrls,
  overallScore,
  summary,
  conditions,
  onScanPress,
  onZoomChange,
}: FaceAnalysisPanelProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <LatestScanPanel
      score={overallScore}
      summary={summary}
      imageUrls={imageUrls}
      conditions={conditions}
      variant="home"
      onScanPress={onScanPress ?? (() => navigation.navigate('ScanFlow'))}
      onZoomChange={onZoomChange}
    />
  );
}
