import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSort, Sort } from '@angular/material/sort';
import { Observable, Subject, Subscription, debounceTime, firstValueFrom } from 'rxjs';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Shared } from 'src/app/shared/shared';
import { MatPaginator } from '@angular/material/paginator';
import { Entity } from '../entity/models/entity';
import { EntityService } from '../entity/services/entity.service';
import { MedicalSpecialty } from 'src/app/components/medical-specialties/models/medical-specialties';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListComponent implements OnInit, AfterViewInit, OnDestroy {
  private searchSubscription: Subscription | undefined;
  entities!: Entity[];
  /**
   * Resize
   */
  clientWidth: number = window.innerWidth;
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.clientWidth = window.innerWidth;
    this.setColumns();
  }
  /*************************************** */
  /**
   * Search Input
   */
  @ViewChild('searchInput') searchInput!: ElementRef;
  searchInputTerm$ = new Subject<string>();
  searchInputModel!: string | null;
  /*************************************** */
  /**
   * Entities table
   */
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource: MatTableDataSource<Entity> = new MatTableDataSource();
  displayedColumns!: string[];
  pageSize: number = 5;
  totalItems$!: Observable<number>;
  medicalSpecialtiesList!: MedicalSpecialty[];
  notFoundData: boolean = false;
  /*************************************** */

  constructor(
    private _liveAnnouncer: LiveAnnouncer,
    private router: Router,
    private cd: ChangeDetectorRef,
    private entityService: EntityService,
    public route: ActivatedRoute,
    public shared: Shared
  ) {
    /**
     * Seach Input
     */
      this.searchInputTerm$
      .pipe(
        debounceTime(500)
      )
      .subscribe({
        next: (res: string) => {
          const searchString = res?.trim();

          if(searchString !== this.route.snapshot.queryParams['search'])
            router.navigate([], (
              searchString.length
              ? { queryParams: { search: shared.slugify(res) }}
              : undefined
            ));
        },
        error: (error) => {
          console.error(error);
        },
      });
    /*************************************** */

    /**
     * Subscribes to the search params
     */
      this.searchSubscription = this.route.queryParams.subscribe(async (params: Params) => {
        this.searchInputModel = this.shared.unSlugify(params['search'] ?? '');

        this.initTable(this.shared.unSlugify(this.searchInputModel));
      });
  }

  async ngOnInit(): Promise<void> {
    const response = await firstValueFrom(this.entityService.getMedicalSpecialties());
    this.medicalSpecialtiesList = Object.values(response?.data ?? []) ?? [];
    this.cd.markForCheck();
  }

  ngAfterViewInit(): void {
    if(!this.dataSource.paginator && this.paginator)
      this.dataSource.paginator = this.paginator;

    this.dataSource.sort = this.sort;
    this.cd.markForCheck();
  }

  get tableData(): Entity[] {
    return this.dataSource.data;
  }

  set tableData(data: Entity[]) {
    this.dataSource.data = data;
  }

  private async initTable(search?: string): Promise<void> {
    this.entities = Object.values(await this.handleEntities(search));

    console.log(this.entities)

    if(this.entities?.length > 0) {
      this.notFoundData = false;
      this.tableData = this.entities;
      this.dataSource.sort = this.sort;

      this.setColumns();
    } else {
      this.notFoundData = true;
    }

    console.log(this.notFoundData)

    this.cd.markForCheck();
  }

  private setColumns(): void {
    const tableBreakpoints ={
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920
    }

    // Mobile(sm)
    if(this.clientWidth < tableBreakpoints.sm ){
      this.displayedColumns = ['fantasy_name'];
    }
    // Mobile/Desktop(md)
    else if(this.clientWidth < tableBreakpoints.md) {
      this.displayedColumns = ['fantasy_name', 'region'];
    }
    // Desktop(lg+)
    else  {
      this.displayedColumns = ['fantasy_name', 'region', 'medical_specialties', 'active', 'actions'];
    }

    this.paginator?._changePageSize(this.pageSize);
  }

  private async handleEntities(search?: string): Promise<Entity[]>{
    return (await firstValueFrom(this.entityService.getEntityList(search))).data!;
  }

  onSearchChange(event: Event): void {
    const inputValue = (event.target as HTMLInputElement).value;

    this.searchInputTerm$.next(inputValue);
  }

  announceSortChange(sortState: Sort): void {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }

  onViewClick(el: Entity): void {
    console.log(el)
    this.router.navigate(['list', el.id]);
  }

  onEditClick(el: Entity): void {
    console.log(el)
    this.router.navigate(['list', el.id, 'editar']);
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) this.searchSubscription.unsubscribe();
  }
}
