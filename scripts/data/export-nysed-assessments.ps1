param(
  [Parameter(Mandatory)][string]$Database,
  [Parameter(Mandatory)][ValidateSet('science','charter')][string]$Phase,
  [Parameter(Mandatory)][string]$OutDir
)
$ErrorActionPreference='Stop'
$sourcePath=(Resolve-Path -LiteralPath $Database).Path
$outputPath=[IO.Path]::GetFullPath($OutDir)
[void][IO.Directory]::CreateDirectory($outputPath)
$connection=[System.Data.Odbc.OdbcConnection]::new("Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=$sourcePath;ReadOnly=1;")
$tables=if($Phase -eq 'science'){@{science='Science'}}else{@{ela='ELA';math='Math'}}
$fields=@('INSTITUTION_ID','ENTITY_CD','ENTITY_NAME','YEAR','ASSESSMENT_NAME','SUBGROUP_NAME','TOTAL_COUNT','NUM_TESTED','NUM_PROF','PER_PROF','ESTIMATE_FLAG')
try {
  $connection.Open()
  foreach($subject in ($tables.Keys | Sort-Object)){
    $query=$connection.CreateCommand()
    try {
      $query.CommandTimeout=120
      $qualified=(($fields | ForEach-Object {"[$_]"}) -join ',')
      # Retain nearby alternate rows in the extract for diagnostics. The importer
      # explicitly selects the regular assessment names before persisting facts.
      $charterFilter=if($Phase -eq 'charter'){" AND MID(ENTITY_CD,7,2)='86'"}else{''}
      $query.CommandText="SELECT $qualified FROM [Annual EM $($tables[$subject])] WHERE [YEAR] IN (2025,2026) AND SUBGROUP_NAME='All Students' AND LEFT(ENTITY_CD,1)='3'$charterFilter"
      $reader=$query.ExecuteReader()
      try {
        & {
          while($reader.Read()){
            $row=[ordered]@{}
            foreach($field in $fields){$row[$field]=if($reader[$field] -is [DBNull]){''}else{[string]$reader[$field]}}
            [pscustomobject]$row
          }
        } | Export-Csv -LiteralPath (Join-Path $outputPath ($subject+'.csv')) -NoTypeInformation -Encoding utf8BOM
      } finally {$reader.Dispose()}
    } finally {$query.Dispose()}
    Write-Host "Exported $subject source extract."
  }
} finally {$connection.Dispose()}
