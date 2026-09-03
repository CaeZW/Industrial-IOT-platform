import { Injectable } from '@nestjs/common';
import type {
  CatalogArea,
  CatalogEquipment,
  CatalogOverview,
  EquipmentKind,
  PageMetadata,
  PageResult,
} from '@industrial-iot-platform/contracts';

import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  CatalogRepository,
  type CatalogQuery,
} from './catalog.repository.js';

const equipmentRelations = {
  area: {
    select: {
      id: true,
      code: true,
      name: true,
      plant: {
        select: { id: true, code: true, name: true },
      },
    },
  },
} as const;

@Injectable()
export class PrismaCatalogRepository extends CatalogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getOverview(): Promise<CatalogOverview> {
    const [plants, areas] = await Promise.all([
      this.prisma.plant.findMany({
        orderBy: { name: 'asc' },
      }),
      this.prisma.area.findMany({
        select: {
          plantId: true,
          _count: { select: { machines: true, devices: true } },
        },
      }),
    ]);

    const countsByPlant = new Map<
      string,
      { areas: number; devices: number; machines: number }
    >();

    for (const area of areas) {
      const counts = countsByPlant.get(area.plantId) ?? {
        areas: 0,
        devices: 0,
        machines: 0,
      };
      counts.areas += 1;
      counts.devices += area._count.devices;
      counts.machines += area._count.machines;
      countsByPlant.set(area.plantId, counts);
    }

    const catalogPlants = plants.map((plant) => {
      const counts = countsByPlant.get(plant.id) ?? {
        areas: 0,
        devices: 0,
        machines: 0,
      };

      return {
        id: plant.id,
        code: plant.code,
        name: plant.name,
        isActive: plant.isActive,
        areaCount: counts.areas,
        deviceCount: counts.devices,
        machineCount: counts.machines,
      };
    });

    return {
      plants: catalogPlants,
      totals: {
        plants: catalogPlants.length,
        areas: areas.length,
        machines: areas.reduce(
          (total, area) => total + area._count.machines,
          0,
        ),
        devices: areas.reduce(
          (total, area) => total + area._count.devices,
          0,
        ),
      },
    };
  }

  async listAreas(query: CatalogQuery): Promise<PageResult<CatalogArea>> {
    const where: Prisma.AreaWhereInput = this.areaWhere(query.search);
    const [items, totalItems] = await Promise.all([
      this.prisma.area.findMany({
        where,
        skip: this.skip(query),
        take: query.pageSize,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: {
          plant: { select: { id: true, code: true, name: true } },
          _count: { select: { machines: true, devices: true } },
        },
      }),
      this.prisma.area.count({ where }),
    ]);

    return {
      items: items.map((area) => ({
        id: area.id,
        code: area.code,
        name: area.name,
        isActive: area.isActive,
        machineCount: area._count.machines,
        deviceCount: area._count.devices,
        plant: area.plant,
      })),
      meta: this.pageMetadata(query, totalItems),
    };
  }

  async listMachines(
    query: CatalogQuery,
  ): Promise<PageResult<CatalogEquipment>> {
    const where: Prisma.MachineWhereInput = this.equipmentWhere(query);
    const [items, totalItems] = await Promise.all([
      this.prisma.machine.findMany({
        where,
        skip: this.skip(query),
        take: query.pageSize,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: equipmentRelations,
      }),
      this.prisma.machine.count({ where }),
    ]);

    return {
      items: items.map((item) =>
        this.equipmentItem('machine', item, item.machineType, item.legacyMachineId),
      ),
      meta: this.pageMetadata(query, totalItems),
    };
  }

  async listDevices(
    query: CatalogQuery,
  ): Promise<PageResult<CatalogEquipment>> {
    const where: Prisma.DeviceWhereInput = this.equipmentWhere(query);
    const [items, totalItems] = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip: this.skip(query),
        take: query.pageSize,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: equipmentRelations,
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      items: items.map((item) =>
        this.equipmentItem('device', item, item.deviceType, item.legacyDeviceId),
      ),
      meta: this.pageMetadata(query, totalItems),
    };
  }

  private areaWhere(search: string | undefined): Prisma.AreaWhereInput {
    const normalizedSearch = search?.trim();

    if (normalizedSearch === undefined || normalizedSearch.length === 0) {
      return {};
    }

    return {
      OR: [
        { name: { contains: normalizedSearch, mode: 'insensitive' } },
        { code: { contains: normalizedSearch, mode: 'insensitive' } },
      ],
    };
  }

  private equipmentWhere(
    query: CatalogQuery,
  ): Prisma.MachineWhereInput & Prisma.DeviceWhereInput {
    const normalizedSearch = query.search?.trim();
    const searchFilter =
      normalizedSearch === undefined || normalizedSearch.length === 0
        ? {}
        : {
            OR: [
              { name: { contains: normalizedSearch, mode: 'insensitive' as const } },
              { code: { contains: normalizedSearch, mode: 'insensitive' as const } },
              {
                description: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
            ],
          };

    return {
      ...searchFilter,
      ...(query.areaId === undefined ? {} : { areaId: query.areaId }),
    };
  }

  private equipmentItem(
    kind: EquipmentKind,
    item: {
      readonly area: {
        readonly code: string;
        readonly id: string;
        readonly name: string;
        readonly plant: {
          readonly code: string;
          readonly id: string;
          readonly name: string;
        };
      };
      readonly code: string | null;
      readonly description: string | null;
      readonly id: string;
      readonly isActive: boolean;
      readonly name: string;
    },
    type: string | null,
    legacyId: number | null,
  ): CatalogEquipment {
    return {
      id: item.id,
      kind,
      code: item.code,
      name: item.name,
      description: item.description,
      type,
      legacyId,
      isActive: item.isActive,
      area: {
        id: item.area.id,
        code: item.area.code,
        name: item.area.name,
      },
      plant: item.area.plant,
    };
  }

  private skip(query: CatalogQuery): number {
    return (query.page - 1) * query.pageSize;
  }

  private pageMetadata(
    query: CatalogQuery,
    totalItems: number,
  ): PageMetadata {
    return {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    };
  }
}
