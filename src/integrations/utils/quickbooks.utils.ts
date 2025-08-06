export function findSection(rows: any[], sectionName: string): any | null {
  if (!rows || !Array.isArray(rows)) {
    return null;
  }

  for (const row of rows) {
    // Check if this row is the section we're looking for
    if (row.Header?.ColData && row.Header.ColData[0]?.value === sectionName) {
      return row;
    }
    // If this row has nested rows, search them recursively
    if (row.Rows?.Row) {
      const foundSection = findSection(row.Rows.Row, sectionName);
      if (foundSection) {
        return foundSection;
      }
    }
  }
  return null;
}

export function extractBalanceByBankAccounts(balanceSheet: any): any[] {
  const assetsSection = findSection(balanceSheet.Rows.Row, 'Assets');
  const currentAssetsSection = findSection(
    assetsSection?.Rows?.Row,
    'Current Assets',
  );
  const bankAccountsSection = findSection(
    currentAssetsSection?.Rows?.Row,
    'Bank Accounts',
  );

  if (bankAccountsSection?.Summary?.ColData?.[1]?.value) {
    // The total balance is in the Summary of the "Bank Accounts" section
    const totalBalance = parseFloat(
      bankAccountsSection.Summary.ColData[1].value,
    );

    // The provided JSON does not list individual bank accounts, just the total.
    // So, we'll return a simple object with that total.
    return [
      {
        accountName: 'Total Bank Accounts',
        balance: totalBalance,
      },
    ];
  }

  // Fallback if no data is found
  return [];
}

export function extractCurrentAssetsByCategory(balanceSheet: any): any[] {
  const assetsSection = findSection(balanceSheet.Rows.Row, 'Assets');
  const currentAssetsSection = findSection(
    assetsSection?.Rows?.Row,
    'Current Assets',
  );

  // The categories are the Headers of the rows nested directly under "Current Assets"
  if (currentAssetsSection?.Rows?.Row) {
    return currentAssetsSection.Rows.Row.map((row) => ({
      category: row.Header?.ColData?.[0]?.value,
      total: row.Summary?.ColData?.[1]?.value,
    }));
  }

  return [];
}

export function findMetricValue(
  rows: any[],
  metricName: string,
): number | null {
  if (!rows || !Array.isArray(rows)) {
    return null;
  }

  for (const row of rows) {
    // Check if this row is a data row with the metric name
    if (row.ColData && row.ColData[0]?.value === metricName) {
      return row.ColData[1]?.value ? parseFloat(row.ColData[1].value) : null;
    }

    // If this row has nested rows, search them recursively
    if (row.Rows?.Row) {
      const foundValue = findMetricValue(row.Rows.Row, metricName);
      if (foundValue !== null) {
        return foundValue;
      }
    }

    // If this row has a Summary with the metric name, check it
    if (row.Summary?.ColData && row.Summary.ColData[0]?.value === metricName) {
      return row.Summary.ColData[1]?.value
        ? parseFloat(row.Summary.ColData[1].value)
        : null;
    }
  }

  return null;
}

export function calculateNetProfitMargin(profitLossReport: any): number | null {
  // Net Profit Margin = (Net Income / Total Revenue)
  const netIncome = findMetricValue(profitLossReport, 'Net Income');
  const totalRevenue = findMetricValue(profitLossReport, 'Total Revenue');
  if (netIncome && totalRevenue) {
    return (netIncome / totalRevenue) * 100;
  }
  return null;
}
