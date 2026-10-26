import { useQuery } from '@tanstack/react-query';
import { RankingReportContent } from '@shared/RankingReportContent';
import type { SchoolStage } from '@shared/ranking-report';
import type { RankingPayload } from '../../../../server/rankingReports';
export function RankingArticle({stage}: {stage:SchoolStage}) {
  const {data} = useQuery<RankingPayload>({queryKey:[`/api/ranking-reports/${stage}`],staleTime:300_000});
  return <RankingReportContent stage={stage} report={data?.report} surveys={data?.surveys}/>;
}
