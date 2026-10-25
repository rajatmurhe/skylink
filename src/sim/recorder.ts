import { TickRecord } from '../types/sim';

export class SimRecorder {
  private records: TickRecord[] = [];

  public recordTick(record: TickRecord): void {
    this.records.push(record);
  }

  public getRecords(): TickRecord[] {
    return this.records;
  }

  public getRecordAt(tick: number): TickRecord | undefined {
    return this.records.find((r) => r.tick === tick);
  }

  public clear(): void {
    this.records = [];
  }

  public getSummary() {
    if (this.records.length === 0) return null;
    const finalRecord = this.records[this.records.length - 1];

    let totalOutageSeconds = 0;
    this.records.forEach((r) => {
      if (r.comm.linkState === 'OUTAGE') {
        totalOutageSeconds += 0.1; // dt = 0.1s
      }
    });

    return {
      totalTicks: this.records.length,
      totalTimeSeconds: finalRecord.timeSeconds,
      capturedValue: finalRecord.waypoints.filter((w) => w.captured).reduce((a, b) => a + b.value, 0),
      totalValue: finalRecord.waypoints.reduce((a, b) => a + b.value, 0),
      remainingBatteryWh: finalRecord.uav.batteryWh,
      totalOutageSeconds,
    };
  }
}
