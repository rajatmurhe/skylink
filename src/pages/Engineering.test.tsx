import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {Airframe} from './Airframe';
import {Submission} from './Submission';
import {MissionControl} from './MissionControl';
import {useSimStore} from '../store/simStore';
vi.mock('../ui/canvas/SimCanvas',()=>({SimCanvas:()=> <div>Map test placeholder</div>}));
afterEach(()=>{cleanup();useSimStore.getState().pause();});
describe('Engineering presentation interactions',()=>{
 it('changing payload power changes the displayed endurance',()=>{render(<Airframe/>);expect(screen.getByText('15.3 min')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Additional payload power'),{target:{value:'80'}});expect(screen.getByText('11.8 min')).toBeInTheDocument();});
 it('viva disclosure exposes an honest implementation boundary',()=>{render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Submission/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Is this a full quadcopter simulation?'}));expect(screen.getByText(/They answer different questions and are not dynamically coupled/)).toBeInTheDocument();});
 it('generating an environment resets briefing and updates the selected scenario',()=>{render(<MemoryRouter><MissionControl/></MemoryRouter>);screen.getAllByRole('checkbox').forEach(c=>fireEvent.click(c));fireEvent.change(screen.getByLabelText('Map seed'),{target:{value:'123'}});fireEvent.click(screen.getByRole('button',{name:'Recreate seed'}));expect(useSimStore.getState().scenario?.id).toBe('generated-v1-urban-moderate-123');expect(screen.getByRole('button',{name:'Play Simulation'})).toBeDisabled();});
 it('preflight review enables playback, revoking a check pauses it',()=>{render(<MemoryRouter><MissionControl/></MemoryRouter>);const play=screen.getByRole('button',{name:'Play Simulation'});expect(play).toBeDisabled();const checks=screen.getAllByRole('checkbox');checks.forEach(c=>fireEvent.click(c));expect(play).toBeEnabled();fireEvent.click(play);expect(useSimStore.getState().isPlaying).toBe(true);fireEvent.click(checks[0]);expect(useSimStore.getState().isPlaying).toBe(false);});
});
