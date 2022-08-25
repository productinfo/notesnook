import { ToolId } from '@streetwriters/editor/dist/es/toolbar';
import React, { RefObject } from 'react';
import { View } from 'react-native';
import ActionSheet from 'react-native-actions-sheet';
import { ScrollView } from 'react-native-gesture-handler';
import { PressableButton } from '../../../components/ui/pressable';
import { SvgView } from '../../../components/ui/svg';
import Paragraph from '../../../components/ui/typography/paragraph';
import { presentSheet } from '../../../services/event-manager';
import { useThemeStore } from '../../../stores/use-theme-store';
import { SIZE } from '../../../utils/size';
import { DraggableItem, useDragState } from './state';
import { findToolById, getToolIcon, getUngroupedTools } from './toolbar-definition';

export default function ToolSheet({
  group,
  fwdRef
}: {
  group: DraggableItem;
  fwdRef: RefObject<ActionSheet>;
}) {
  const colors = useThemeStore(state => state.colors);
  const data = useDragState(state => state.data);
  const ungrouped = getUngroupedTools(data) as ToolId[];

  const renderTool = React.useCallback((item: ToolId) => {
    //@ts-ignore
    const tool = findToolById(item);
    //@ts-ignore
    const iconSvgString = tool ? getToolIcon(tool.icon) : null;
    return (
      <PressableButton
        key={item}
        type="grayBg"
        onPress={() => {
          const _data = useDragState.getState().data.slice();
          if (group.groupIndex !== undefined) {
            //@ts-ignore
            _data[group.groupIndex][group.index].unshift(item);
          } else {
            _data[group.index].unshift(item);
          }
          useDragState.getState().setData(_data);
        }}
        customStyle={{
          marginBottom: 10,
          width: '100%',
          height: 50,
          paddingHorizontal: 12,
          paddingRight: 0,
          borderRadius: 5,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          {iconSvgString ? <SvgView width={23} height={23} src={iconSvgString} /> : null}
          <Paragraph
            style={{
              marginLeft: iconSvgString ? 10 : 0
            }}
            color={colors.pri}
            size={SIZE.sm}
          >
            {tool?.title}
          </Paragraph>
        </View>
      </PressableButton>
    );
  }, []);

  return (
    <View
      style={{
        maxHeight: '100%',
        padding: 12
      }}
    >
      <ScrollView
        onMomentumScrollEnd={() => {
          fwdRef.current?.handleChildScrollEnd();
        }}
        nestedScrollEnabled={true}
      >
        {!ungrouped || ungrouped.length === 0 ? (
          <Paragraph
            style={{
              alignSelf: 'center'
            }}
            color={colors.icon}
          >
            You have grouped all the tools.
          </Paragraph>
        ) : (
          ungrouped.map(renderTool)
        )}
        <View
          style={{
            height: 200
          }}
        />
      </ScrollView>
    </View>
  );
}

ToolSheet.present = (payload: DraggableItem) => {
  presentSheet({
    component: ref => <ToolSheet fwdRef={ref} group={payload} />
  });
};