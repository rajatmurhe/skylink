import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {Home} from './Home';import {MissionControl} from './MissionControl';import {Compare} from './Compare';import {Builder} from './Builder';import {Benchmark} from './Benchmark';import {AILab} from './AILab';import {Learn} from './Learn';import {FlightLab} from './FlightLab';import {Airframe} from './Airframe';import {Submission} from './Submission';
import {useSimStore} from '../store/simStore';import urban from '../scenarios/urban.json';
beforeAll(()=>{
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:800,height:400,x:0,y:0,top:0,left:0,bottom:400,right:800,toJSON(){return {}}});
 vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
});
afterEach(()=>{cleanup();useSimStore.getState().pause();});
describe('All public page render smoke tests (DOM, not visual browser QA)',()=>{
 for(const [Page,title] of [[Home,/Mission first/],[MissionControl,/Mission control/],[Compare,/Side by Side/],[Builder,/Interactive Mission Scenario/],[Benchmark,/Headless Batch/],[AILab,/AI Lab:/],[Learn,/System Architecture/],[FlightLab,/Stability, made visible/],[Airframe,/Design the trade-off/],[Submission,/Built to demonstrate/]] as const){
  it(`renders ${Page.name} without throwing`,()=>{render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Page/></MemoryRouter>);expect(screen.getByRole('heading',{level:1,name:title})).toBeInTheDocument();});
 }
 it('builder retains selected scenario and supports add, undo and redo',()=>{
  useSimStore.getState().loadScenario(urban);render(<Builder/>);
  expect(useSimStore.getState().scenario?.id).toBe(urban.id);
  fireEvent.click(screen.getByRole('button',{name:'Add Waypoint'}));expect(useSimStore.getState().engine.waypoints).toHaveLength(urban.waypoints.length+1);
  fireEvent.click(screen.getByTitle('Undo'));expect(useSimStore.getState().engine.waypoints).toHaveLength(urban.waypoints.length);
  fireEvent.click(screen.getByTitle('Redo'));expect(useSimStore.getState().engine.waypoints).toHaveLength(urban.waypoints.length+1);
 });
 it('builder adds within an imported small geofence',()=>{
  const small=structuredClone(urban);small.world.mapSize={width:200,height:200};small.world.geofence={xMin:20,xMax:180,yMin:20,yMax:180};small.world.homePosition={x:50,y:50};small.world.towers=[];small.world.obstacles=[];small.world.jammers=[];small.waypoints=[];
  useSimStore.getState().loadScenario(small);render(<Builder/>);fireEvent.click(screen.getByRole('button',{name:'Add Waypoint'}));expect(useSimStore.getState().engine.waypoints[0].position).toEqual({x:100,y:100});
 });
});
